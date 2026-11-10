import { portfolioHandlers } from "@/lib/portfolio-handlers";
import { authorizePortfolio } from "@/lib/portfolio-server";
export const { GET, PUT } = portfolioHandlers(authorizePortfolio);
