export interface TemplateDefinition {
  id:          number;
  name:        string;
  category:    string;
  description: string;
  tags:        string[];
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id:          1,
    name:        "Modern Clean",
    category:    "modern",
    description: "Bold blue header with clean white body. Great for tech and product roles.",
    tags:        ["Tech", "Product", "Design"],
  },
  {
    id:          2,
    name:        "Classic Professional",
    category:    "classic",
    description: "Dark slate header with timeless structure. Ideal for finance and law.",
    tags:        ["Finance", "Law", "Consulting"],
  },
  {
    id:          3,
    name:        "Minimal Elegant",
    category:    "minimal",
    description: "Clean, border-only header. Lets your content speak for itself.",
    tags:        ["Creative", "Academic", "Any role"],
  },
  {
    id:          4,
    name:        "Jake's Resume",
    category:    "jake",
    description: "The iconic Overleaf template by Jake Gutierrez. Centered header, ruled sections, single-column. The gold standard for software engineering roles.",
    tags:        ["SWE", "CS", "ATS-optimized"],
  },
];
