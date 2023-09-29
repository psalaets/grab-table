---
layout: layout.njk
---

# {{pkg.name}}

This bookmarklet grabs table data from a webpage.

## Install

Drag this link to the bookmarks toolbar <a href="javascript:{{code.latest}}">{{pkg.name}}</a>

## Usage

1. Click {{pkg.name}} in the bookmarks toolbar
2. Click any table on the page (or press Esc to cancel)
3. In the popup...
    - Choose a data format.
    - Click Download or click Copy.

## Demo

<a href="javascript:{{code.latest}}">Activate the bookmarklet</a> and then click this table.

<table>
  <caption>Demo table</caption>
  <thead>
    <tr>
      <th>Product ID</th>
      <th>Name</th>
      <th>Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Car</td>
      <td>10000</td>
    </tr>
    <tr>
      <td>2</td>
      <td>House</td>
      <td>100000</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Chair</td>
      <td>20</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Desk</td>
      <td>200</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Gum</td>
      <td>3</td>
    </tr>
  </tbody>
</table>

## JSON output shape

```ts
type Cell = {
  type: 'td' | 'th';
  value: string;
  colSpan: number;
  rowSpan: number;
};

type Row = Array<Cell>;

type JsonOutput = {
  caption: string | null;
  rows: Array<Row>;
};
```
