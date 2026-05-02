---
meeting: 1
type: "praxis"
date: {{ .Date }}
meta:
  - "IIIT Hyderabad"
  - "{{ dateFormat "2 January 2006" .Date }}"
  - "Open"
sectioned: true
---

## Section Heading

Body. Each `##` opens a numbered section because `sectioned: true`.

{{</* cta */>}}A pull-quote or call to action.{{</* /cta */>}}
