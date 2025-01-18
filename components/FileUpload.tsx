"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // 检查文件类型
      if (!file.type.includes('pdf') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
        toast({
          title: "不支持的文件类型",
          description: "请上传 PDF 或 Word 文档",
          variant: "destructive",
        });
        return;
      }
      setFile(file);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "请选择文件",
        description: "请先选择要上传的文件",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const data = await response.json();
      setUploadedUrl(data.url);
      toast({
        title: "上传成功",
        description: "文件已上传，点击复制链接",
      });
      setFile(null);
    } catch (error) {
      toast({
        title: "上传失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    if (uploadedUrl && inputRef.current) {
      // 选中输入框中的文本
      inputRef.current.select();
      // 尝试使用 document.execCommand
      try {
        document.execCommand('copy');
        toast({
          title: "复制成功",
          description: "链接已复制到剪贴板",
        });
      } catch (err) {
        // 如果 execCommand 失败，尝试使用 clipboard API
        navigator.clipboard.writeText(uploadedUrl).then(() => {
          toast({
            title: "复制成功",
            description: "链接已复制到剪贴板",
          });
        }).catch(() => {
          // 如果都失败了，提示用户手动复制
          toast({
            title: "请手动复制",
            description: "请按 Ctrl+C 复制链接",
            variant: "destructive",
          });
        });
      }
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary"}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-lg">放开以上传文件</p>
          ) : (
            <div>
              <p className="text-lg mb-2">拖拽文件到此处，或点击选择文件</p>
              <p className="text-sm text-gray-500">支持的文件类型：PDF、Word文档</p>
              <p className="text-sm text-gray-500">文件大小限制：10MB</p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 truncate">
                <p className="font-medium">已选择文件：</p>
                <p className="text-sm text-gray-500 truncate">{file.name}</p>
              </div>
              <Button onClick={() => setFile(null)} variant="outline">
                取消
              </Button>
            </div>
            <Button onClick={handleUpload} className="w-full">
              上传文件
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={!!uploadedUrl} onOpenChange={() => setUploadedUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>文件上传成功</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                ref={inputRef}
                value={uploadedUrl || ''} 
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button onClick={copyToClipboard}>
                复制链接
              </Button>
            </div>
            <div className="text-sm text-gray-500 text-center">
              提示：您也可以手动选中链接后按 Ctrl+C 复制
            </div>
            <Button onClick={() => window.open(uploadedUrl || '', '_blank')} className="w-full">
              打开文件
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 