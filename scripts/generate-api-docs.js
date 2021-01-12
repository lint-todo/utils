const path = require('path');
const fs = require('fs');
const jsdoc2md = require('jsdoc-to-markdown');

(async function () {
  const readmeFile = path.resolve(__dirname, '../README.md');
  const readmeContent = fs.readFileSync(readmeFile, 'utf8');
  const docsPlaceholder = /<!--DOCS_START-->[\S\s]*<!--DOCS_END-->/;

  let docsContent = await jsdoc2md.render({
    files: ['lib/builders.js', 'lib/io.js', 'lib/todo-config.js', 'lib/get-severity.js'],
  });

  fs.writeFileSync(
    readmeFile,
    readmeContent.replace(docsPlaceholder, `<!--DOCS_START-->\n\n${docsContent}\n<!--DOCS_END-->`)
  );
})();
