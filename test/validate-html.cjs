const fs = require('fs');
const { parseDocument } = require('htmlparser2');

const html = fs.readFileSync('./index.html', 'utf-8');
const doc = parseDocument(html);

const issues = [];
const ids = new Set();
const labelFors = [];

function getLineNumber(html, index) {
  if (!index) return '?';
  return html.substring(0, index).split('\n').length;
}

function getNodeName(node) {
  if (node.type === 'tag') return `<${node.name}>`;
  return 'text/other';
}

function isInSymbol(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.name === 'symbol') return true;
    parent = parent.parent;
  }
  return false;
}

function walk(node, depth = 0) {
  if (!node) return;
  
  if (node.type === 'tag') {
    // Collect IDs
    if (node.attribs && node.attribs.id) {
      const id = node.attribs.id;
      if (ids.has(id)) {
        const line = getLineNumber(html, node.startIndex);
        issues.push(`DUPLICATE ID: "${id}" at line ${line}`);
      }
      ids.add(id);
    }
    
    // Check labels
    if (node.name === 'label' && node.attribs && node.attribs.for) {
      labelFors.push({ for: node.attribs.for, line: getLineNumber(html, node.startIndex) });
    }
    
    // Check for flow content inside button (invalid)
    if (node.name === 'button' && node.children) {
      node.children.forEach(child => {
        if (child.type === 'tag' && ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.name)) {
          const line = getLineNumber(html, child.startIndex);
          issues.push(`INVALID: <${child.name}> inside <button> at line ${line}`);
        }
      });
    }
    
    // Check images/svg for alt or aria-label (but skip symbol definitions and aria-hidden)
    if (node.name === 'svg' && !isInSymbol(node) && node.attribs['aria-hidden'] !== 'true' && !node.attribs['aria-label'] && !node.attribs.role) {
      const line = getLineNumber(html, node.startIndex);
      // Check if it's a <use> ref or has role="img"
      let hasUse = false;
      if (node.children) {
        node.children.forEach(c => {
          if (c.type === 'tag' && c.name === 'use') hasUse = true;
        });
      }
      if (hasUse) {
        // SVGs with <use> typically should have aria-label
        issues.push(`SVG with <use> at line ${line}: needs aria-label`);
      }
    }
    
    if (node.name === 'img') {
      if (!node.attribs || (!node.attribs.alt && !node.attribs['aria-label'])) {
        const line = getLineNumber(html, node.startIndex);
        issues.push(`<img> at line ${line}: needs alt or aria-label`);
      }
    }
  }
  
  if (node.children) {
    node.children.forEach(child => walk(child, depth + 1));
  }
}

walk(doc);

// Check label.for references
labelFors.forEach(label => {
  if (!ids.has(label.for)) {
    issues.push(`DANGLING LABEL: for="${label.for}" at line ${label.line} (id not found)`);
  }
});

console.log('=== HTML VALIDITY CHECK ===');
if (issues.length === 0) {
  console.log('PASS: No structural issues found');
  console.log('- IDs collected:', ids.size);
  console.log('- Labels checked:', labelFors.length);
} else {
  console.log('ISSUES FOUND:');
  issues.forEach(issue => console.log('  ' + issue));
}
