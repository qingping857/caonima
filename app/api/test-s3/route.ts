import { NextResponse } from "next/server";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";

export async function GET() {
  try {
    console.log("开始测试 S3 连接");
    
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log("获取到的存储桶列表:", response.Buckets);
    
    return NextResponse.json({ 
      success: true,
      buckets: response.Buckets
    });
  } catch (error) {
    console.error("S3 连接测试失败:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 