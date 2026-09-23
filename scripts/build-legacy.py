import ast,json,unicodedata,re,pathlib,sys
root=ast.parse(pathlib.Path(sys.argv[1]).read_text())
players=next(ast.literal_eval(n.value) for n in root.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='players' for t in n.targets))
norm=lambda s:re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
byname={norm(p[3]):p for p in players};aliases={'Penny Hardaway':'Anfernee Hardaway'};legends=[]
for row in pathlib.Path('data/legends-source.tsv').read_text().splitlines():
 name,team,pos,*attrs=row.split('|');p=byname[norm(aliases.get(name,name))];values=list(map(int,attrs))
 stats=dict(zip(['inside','shooting','playmaking','defense','rebounding','athleticism'],values));ovr=round(sum(values)/6*.58+max(values)*.42)
 legends.append({'id':str(p[0]),'name':p[3],'displayName':name,'team':team,'positions':pos.split(','),'attributes':stats,'overall':ovr,'legend':True,'image':f'https://cdn.nba.com/headshots/nba/latest/260x190/{p[0]}.png','profile':f'https://www.nba.com/player/{p[0]}'})
pathlib.Path('data/legends.js').write_text('export const legends = '+json.dumps(legends,ensure_ascii=False,separators=(',',':'))+';\n')
pathlib.Path('data/archive.js').write_text('export const archive = '+json.dumps([[str(p[0]),p[3],p[4]] for p in players],ensure_ascii=False,separators=(',',':'))+';\n')
print(len(players),'archive players;',len(legends),'curated legends')
