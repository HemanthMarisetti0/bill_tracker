import { useContext } from "react";
import { CategoriesContext } from "./CategoriesContext";

export function useCategories() {
  return useContext(CategoriesContext);
}
