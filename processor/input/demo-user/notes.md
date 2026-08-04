# Processor notes

## Chunking

The current splitter is `RecursiveCharacterTextSplitter` with a 1000 character
chunk size and 200 character overlap. It splits on raw characters, not tokens,
so chunk boundaries do not necessarily line up with sentence or section breaks.

## Tagging

Tags are extracted with YAKE, a fast unsupervised keyword extraction library.
It works purely on statistics (word frequency, position, co-occurrence) and
does not understand semantics, so keyword quality varies a lot by document type.

## Open questions

- Should markdown and PDF documents be chunked differently, respecting headers
  and page boundaries instead of a flat character count?
- Would an LLM-based tagger produce meaningfully better tags than YAKE for a
  reasonable added cost/latency?
