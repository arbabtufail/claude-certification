import { LessonLayout } from "@/components/LessonLayout";
import { lessonTitle } from "@/lib/courses";
import { McpDemo } from "./McpDemo";

export const metadata = { title: lessonTitle("claude-platform-101", "09-mcp") };

export default function Page() {
  return (
    <LessonLayout
      course="claude-platform-101"
      lesson="09-mcp"
      intro={
        <>
          Tools are for your stuff, Skills for your processes, <b>MCP for everyone else&apos;s stuff</b>. Declare the
          connection in <code>mcp_servers</code>, grant access with an <code>mcp_toolset</code>, and Claude discovers the
          server&apos;s tools by itself. Connector code: <code>lib/claude/mcp.ts</code>. Servers:{" "}
          <code>lib/courses/claude-platform-101/lesson-09.ts</code>.
        </>
      }
    >
      <McpDemo />
    </LessonLayout>
  );
}
