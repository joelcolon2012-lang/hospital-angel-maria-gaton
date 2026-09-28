const ts = require('typescript'), fs = require('fs'), path = require('path');
const files = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const result = { total:0, byFile:{}, candidates:[] };
for(const file of files('src').filter(f=>f.endsWith('.tsx'))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node) {
    if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)) {
      const tag=node.tagName.getText(source);
      if(['button','Button'].includes(tag)) {
        result.total++; result.byFile[file]=(result.byFile[file]||0)+1;
        const attrs=node.attributes.properties;
        const click=attrs.find(a=>a.name?.getText(source)==='onClick');
        const type=attrs.find(a=>a.name?.getText(source)==='type');
        if(!click && !attrs.some(a=>ts.isJsxSpreadAttribute(a)) && type?.initializer?.text !== 'submit') result.candidates.push({file,line:source.getLineAndCharacterOfPosition(node.pos).line+1,jsx:node.getText(source)});
        if(click && /=>\s*\{\s*\}/.test(click.getText(source))) result.candidates.push({file,line:source.getLineAndCharacterOfPosition(node.pos).line+1,jsx:click.getText(source)});
      }
    }
    ts.forEachChild(node,visit);
  } visit(source);
}
fs.mkdirSync('audit',{recursive:true}); fs.writeFileSync('audit/buttons.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({total:result.total,files:Object.keys(result.byFile).length,candidates:result.candidates},null,2));
