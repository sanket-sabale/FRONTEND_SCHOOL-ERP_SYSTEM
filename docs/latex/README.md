# School ERP SaaS LaTeX Documentation

This is the codebase-grounded LaTeX documentation project for the existing School ERP SaaS application.

## Build

Install a TeX distribution with XeLaTeX and latexmk, then run:

```bash
cd docs/latex
latexmk -xelatex main.tex
```

or:

```bash
make pdf
```

## Structure

- `main.tex`: main document entry point.
- `config/`: packages, colors, metadata, typography, reusable commands.
- `frontmatter/`: cover, document info, executive summary, glossary.
- `chapters/`: architecture and module documentation.
- `appendices/`: complete route catalog, permission matrix, project structure, service inventory.
- `diagrams/`: TikZ diagrams.
- `bibliography/`: references.

## Source of Truth

This documentation is based on the current source tree, especially `src/app`, `src/config`, `src/features`, `src/lib`, `src/types`, package metadata, and project Markdown files.
