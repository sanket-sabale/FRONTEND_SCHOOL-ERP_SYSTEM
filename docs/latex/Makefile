TEX=main.tex
.PHONY: all pdf clean distclean view
all: pdf
pdf:
	latexmk -xelatex -interaction=nonstopmode -halt-on-error $(TEX)
clean:
	latexmk -c
distclean:
	latexmk -C
view:
	latexmk -pv -xelatex $(TEX)
