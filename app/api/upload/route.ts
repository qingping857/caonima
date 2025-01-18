import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";

const BUCKET_NAME = "e70smp8t-caonima";

export async function POST(request: NextRequest) {
  try {
    console.log("开始处理上传请求");
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("没有接收到文件");
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${file.name}`;
    console.log("准备上传文件:", uniqueFileName);

    // 将文件内容转换为 Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 根据文件类型设置正确的 Content-Type
    let contentType = file.type;
    if (file.name.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      contentType = 'application/msword';
    }

    // 上传到对象存储
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: 'inline',
      // 设置 CORS 头，允许在浏览器中预览
      Metadata: {
        'x-amz-meta-cache-control': 'public, max-age=31536000',
        'x-amz-meta-access-control-allow-origin': '*'
      }
    });

    await s3Client.send(command);
    console.log("文件上传完成");

    // 生成直接可访问的链接
    const fileUrl = `https://objectstorageapi.bja.sealos.run/${BUCKET_NAME}/${uniqueFileName}`;
    console.log("生成访问链接:", fileUrl);

    return NextResponse.json({ 
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: contentType
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 