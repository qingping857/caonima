import { FileUpload } from "@/components/FileUpload";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">文档链接分享</h1>
        <FileUpload />
      </div>
      <Toaster />
    </main>
  );
}
