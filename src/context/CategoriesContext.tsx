import { createContext } from "react";

import { buildCategoryCatalog, type CategoryCatalog } from "../lib/categories";

/*
 * Built-in types until the user's
 * own types have loaded.
 */
export const CategoriesContext = createContext<CategoryCatalog>(
  buildCategoryCatalog(),
);
