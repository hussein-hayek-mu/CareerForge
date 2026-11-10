import { documentDemoHandlers } from "@/lib/document-demo-handlers";
import { authorizeDocumentDemo } from "@/lib/document-demo-server";

export const { POST } = documentDemoHandlers(authorizeDocumentDemo);
