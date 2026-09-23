"""Rebuild the curated player module from the maintained TSV and an nba_api data.py reference.
Usage: python3 scripts/build-roster.py /path/to/nba_api/stats/library/data.py
The reference is parsed as data, never executed.
"""
import ast,json,unicodedata,re,pathlib,sys
root=ast.parse(pathlib.Path(sys.argv[1]).read_text())
ref=next(ast.literal_eval(n.value) for n in root.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='players' for t in n.targets))
norm=lambda s: re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
byname={norm(p[3]):p for p in ref}
alias={'Jimmy Butler':'Jimmy Butler III','Bobby Portis':'Bobby Portis Jr.'}
players=[]
for row in pathlib.Path('data/roster-source.tsv').read_text().splitlines():
 name,team,pos,*attrs=row.split('|');p=byname[norm(alias.get(name,name))];values=list(map(int,attrs))
 stats=dict(zip(['inside','shooting','playmaking','defense','rebounding','athleticism'],values))
 ovr=round(sum(values)/6*.58+max(values)*.42)
 players.append({'id':str(p[0]),'name':p[3],'team':team,'positions':pos.split(','),'attributes':stats,'overall':ovr,'image':f'https://cdn.nba.com/headshots/nba/latest/260x190/{p[0]}.png','profile':f'https://www.nba.com/player/{p[0]}'})
assert len(players)==100,len(players)
pathlib.Path('data/players.js').write_text('export const players = '+json.dumps(players,ensure_ascii=False,separators=(',',':'))+';\n')
print('Saved',len(players),'players with verified NBA IDs')
