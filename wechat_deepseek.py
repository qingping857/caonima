from flask import Flask, request
import hashlib
import logging
import xml.etree.ElementTree as ET
import time
import requests
import json
from collections import deque
from threading import Semaphore, Lock
from queue import Queue
import signal

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置
WECHAT_TOKEN = "cursor123456"
WECHAT_ENCODING_AES_KEY = "rJ0OYnVzQH61onULvOPE6F2vrvjsCw3SvT0PJoM5HHI"
MAX_CONCURRENT = 10  # 最大并发数
MAX_QUEUE_SIZE = 30  # 最大排队数
MAX_HISTORY = 10    # 每个用户最大历史消息数

# 全局变量
user_contexts = {}  # 用户历史消息
request_semaphore = Semaphore(MAX_CONCURRENT)  # 并发控制
request_queue = Queue(maxsize=MAX_QUEUE_SIZE)  # 请求队列
emergency_lock = Lock()  # 紧急停止锁
is_emergency = False    # 紧急状态标志

class UserContext:
    def __init__(self, max_history=MAX_HISTORY):
        self.messages = deque(maxlen=max_history)
        self.last_active = time.time()
    
    def add_message(self, role, content):
        self.messages.append({"role": role, "content": content})
        self.last_active = time.time()
    
    def get_context(self):
        return list(self.messages)

def emergency_stop():
    """紧急停止服务"""
    global is_emergency
    with emergency_lock:
        is_emergency = True
        logger.warning("紧急停止服务已激活")

def resume_service():
    """恢复服务"""
    global is_emergency
    with emergency_lock:
        is_emergency = False
        logger.info("服务已恢复")

def clean_history_messages(messages):
    """清理历史消息中的思考标签"""
    cleaned_messages = []
    for msg in messages:
        content = msg["content"]
        if msg["role"] == "assistant":
            # 只保留最终答案，移除思考过程
            if "【/思考】" in content:
                content = content.split("【/思考】")[1].strip()
        cleaned_messages.append({"role": msg["role"], "content": content})
    return cleaned_messages

def ask_ollama(user_id, prompt):
    """使用 Ollama API 获取回复"""
    try:
        # 检查紧急状态
        if is_emergency:
            return "系统正在维护，请稍后重试"

        # 获取用户上下文
        if user_id not in user_contexts:
            user_contexts[user_id] = UserContext()
        
        context = user_contexts[user_id]
        
        # 清理历史消息中的思考标签
        cleaned_context = clean_history_messages(context.get_context())
        
        # 构建带上下文的提示
        enhanced_prompt = (
            "请记住：\n"
            "1. 你只需要思考一次，将所有思考过程写在一个<think>标签中\n"
            "2. 你的回复结构必须是：一个<think>标签的思考过程 + 最终答案\n"
            "3. 字数限制：\n"
            "   - <think>标签内的思考过程：最多100字\n"
            "   - 最终答案：最多200字\n"
            f"历史对话：{json.dumps(cleaned_context, ensure_ascii=False)}\n"
            f"用户问题：{prompt}"
        )
        
        # 尝试获取信号量
        if not request_semaphore.acquire(blocking=False):
            # 尝试加入队列
            try:
                request_queue.put_nowait((user_id, prompt))
                return "系统繁忙，请稍等片刻~"
            except Queue.Full:
                return "系统非常繁忙，请稍后重试"

        try:
            logger.debug(f"准备发送到Ollama的数据: {json.dumps({'model': 'deepseek-r1:32b', 'prompt': enhanced_prompt, 'stream': False}, ensure_ascii=False)}")
            
            response = requests.post('http://localhost:11434/api/generate',
                                   json={
                                       'model': 'deepseek-r1:32b',
                                       'prompt': enhanced_prompt,
                                       'stream': False
                                   })
            
            result = response.json()
            response_text = result['response']
            response_text = response_text.replace('<think>', '【思考】').replace('</think>', '【/思考】')
            
            # 更新用户上下文
            context.add_message("user", prompt)
            context.add_message("assistant", response_text)
            
            return response_text
            
        finally:
            request_semaphore.release()
            
    except Exception as e:
        logger.error(f"Ollama API 错误：{str(e)}", exc_info=True)
        return "抱歉，我现在有点累，请稍后再试~"

@app.route('/wechat', methods=['GET', 'POST'])
def wechat():
    try:
        logger.info(f"收到{request.method}请求")
        
        if request.method == 'GET':
            # 处理服务器配置验证
            signature = request.args.get('signature', '')
            timestamp = request.args.get('timestamp', '')
            nonce = request.args.get('nonce', '')
            echostr = request.args.get('echostr', '')
            
            temp = [WECHAT_TOKEN, timestamp, nonce]
            temp.sort()
            temp_str = ''.join(temp)
            hash_sha1 = hashlib.sha1(temp_str.encode('utf-8')).hexdigest()
            
            if hash_sha1 == signature:
                return echostr
            return ''
                
        else:
            # 处理微信消息
            xml_data = request.data
            if not xml_data:
                return "success"
                
            xml_str = xml_data.decode('utf-8')
            xml_tree = ET.fromstring(xml_str)
            
            msg_type = xml_tree.find('MsgType')
            if msg_type is None:
                return "success"
                    
            msg_type = msg_type.text
            from_user = xml_tree.find('FromUserName').text
            to_user = xml_tree.find('ToUserName').text
            
            if msg_type == 'text':
                content = xml_tree.find('Content').text
                logger.info(f"收到文本消息：{content}")
                
                # 获取AI回复
                reply_content = ask_ollama(from_user, content)
                
                # 构造回复XML
                reply_xml = f"""
                <xml>
                    <ToUserName><![CDATA[{from_user}]]></ToUserName>
                    <FromUserName><![CDATA[{to_user}]]></FromUserName>
                    <CreateTime>{int(time.time())}</CreateTime>
                    <MsgType><![CDATA[text]]></MsgType>
                    <Content><![CDATA[{reply_content}]]></Content>
                </xml>
                """
                
                return reply_xml, 200, {'Content-Type': 'text/xml'}
                    
            return "success"
                
    except Exception as e:
        logger.error(f"处理请求时发生错误：{str(e)}", exc_info=True)
        return "success"

def cleanup_old_contexts():
    """清理超过1小时未活动的用户上下文"""
    current_time = time.time()
    for user_id in list(user_contexts.keys()):
        if current_time - user_contexts[user_id].last_active > 3600:
            del user_contexts[user_id]

if __name__ == '__main__':
    logger.info("=== 微信公众号服务器启动 ===")
    logger.info(f"使用的Token: {WECHAT_TOKEN}")
    logger.info(f"使用的EncodingAESKey: {WECHAT_ENCODING_AES_KEY}")
    
    # 设置定时清理
    from threading import Timer
    Timer(3600, cleanup_old_contexts).start()
    
    # 设置信号处理
    def signal_handler(signum, frame):
        emergency_stop()
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    app.run(host='0.0.0.0', port=8080, debug=False)