import {mkdir,rm,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','src','data','assets','.nojekyll'])await cp(path,`dist/${path}`,{recursive:true});
console.log('NBA Shenanigans built in dist/. No bundler, API key, or backend required.');
