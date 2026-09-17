# School ERP SaaS Platform Documentation

This directory contains a modular LaTeX documentation project for the existing School ERP SaaS codebase.

## Purpose

The document is intended for architecture review, developer onboarding, technical handover, academic/project submission, and future AI coding-agent context. It documents the current implementation and clearly separates implemented, partially implemented, planned, future, and not implemented capabilities.

## Prerequisites

Install a TeX distribution with XeLaTeX support:

- TeX Live, MacTeX, or MiKTeX
- `latexmk`
- XeLaTeX or LuaLaTeX

## Build

```bash
latexmk -xelatex main.tex
```

or:

```bash
make pdf
```

Clean generated files:

```bash
make clean
```

Fully remove build artifacts:

```bash
make distclean
```

## Structure

- `main.tex`: document entry point.
- `config/`: packages, colors, typography, metadata, and reusable commands.
- `frontmatter/`: cover, title page, document information, abstract, lists, and glossary.
- `chapters/`: numbered technical chapters.
- `appendices/`: API, folder structure, permission matrix, glossary, and checklist.
- `diagrams/`: TikZ diagrams included by chapters.
- `bibliography/`: references file.

## Updating Metadata

Edit `config/metadata.tex`. Do not hardcode organization or author values in chapters.

## Adding Chapters

Create a new file under `chapters/` and add `\input{chapters/<file>}` to `main.tex`.

## Notes

This documentation is based on the current project source and available Markdown documentation. Where implementation details are not available, the document explicitly states that the information is not currently specified.
