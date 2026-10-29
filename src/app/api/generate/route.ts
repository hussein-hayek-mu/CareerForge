import { documentDemoHandlers } from "@/lib/document-demo-handlers";
import { authorizeDocumentDemo } from "@/lib/document-demo-server";

// Compatibility URL required by the owner's byte-for-byte PortfolioBuilder.jsx.
const { compatibilityPOST } = documentDemoHandlers(authorizeDocumentDemo);
export { compatibilityPOST as POST };
