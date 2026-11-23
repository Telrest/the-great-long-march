const JOURNEY_POINTS = {
  yudu: [945, 583, '于都', 'right'],
  xinfeng: [873, 627, '信丰'],
  rucheng: [811, 596, '汝城'],
  yizhang: [753, 615, '宜章'],
  xiangjiang: [677, 573, '湘江界首', 'bottom'],
  tongdao: [605, 525, '通道'],
  liping: [555, 523, '黎平', 'right'],
  wujiang: [507, 479, '乌江'],
  zunyi: [455, 432, '遵义', 'right'],
  tucheng: [391, 394, '土城'],
  zhaxi: [328, 442, '扎西', 'left'],
  second: [403, 423, '二渡赤水'],
  maotai: [398, 451, '茅台'],
  third: [365, 422, '三渡赤水'],
  fourth: [382, 384, '四渡赤水'],
  south: [426, 499, '南渡乌江'],
  yunnan: [329, 550, '入滇'],
  jinsha: [246, 506, '金沙江', 'left'],
  yihai: [248, 436, '彝海'],
  anshun: [269, 394, '安顺场'],
  dadu: [255, 335, '泸定桥', 'left'],
  jiajin: [293, 298, '夹金山'],
  maogong: [277, 250, '懋功', 'left'],
  grassland: [331, 198, '草地', 'left'],
  laziko: [378, 161, '腊子口'],
  hadapu: [421, 141, '哈达铺', 'bottom'],
  liupan: [531, 105, '六盘山'],
  wuqi: [642, 73, '吴起镇', 'right'],
  hejia: [879, 279, '何家冲', 'right'],
  tongbai: [807, 240, '桐柏山'],
  shangluo: [708, 193, '鄂豫陕'],
  yongping: [704, 96, '永坪', 'right'],
  chuan: [470, 271, '川陕根据地', 'right'],
  jialing: [404, 258, '嘉陵江'],
  ganzi: [186, 282, '甘孜', 'left'],
  sangzhi: [663, 434, '桑植', 'right'],
  qianxi: [432, 527, '黔西'],
  zhongdian: [164, 477, '中甸', 'left'],
  huining: [462, 79, '会宁', 'left'],
  jiangtai: [520, 68, '将台堡', 'right'],
};

const JOURNEY_MAIN = [
  'yudu', 'xinfeng', 'rucheng', 'yizhang', 'xiangjiang', 'tongdao', 'liping',
  'wujiang', 'zunyi', 'tucheng', 'zhaxi', 'second', 'zunyi', 'maotai', 'third',
  'fourth', 'south', 'yunnan', 'jinsha', 'yihai', 'anshun', 'dadu', 'jiajin',
  'maogong', 'grassland', 'laziko', 'hadapu', 'liupan', 'wuqi',
];

const JOURNEY_OTHER = [
  { name: '红二十五军', color: '#b4d4c8', path: ['hejia', 'tongbai', 'shangluo', 'yongping'] },
  { name: '红四方面军', color: '#f2c987', path: ['chuan', 'jialing', 'maogong', 'ganzi', 'grassland', 'huining'] },
  { name: '红二方面军', color: '#b3c5e5', path: ['sangzhi', 'qianxi', 'yunnan', 'zhongdian', 'ganzi', 'grassland', 'jiangtai'] },
];

const JOURNEY_MEETINGS = [
  { color: '#ec8060', path: ['wuqi', 'liupan', 'huining'] },
  { color: '#ec8060', path: ['liupan', 'jiangtai'] },
];

const JOURNEY_CUES = {
  soviet: ['yudu', 0, 0],
  yudu: ['yudu', 0, 0],
  blockades: ['yizhang', 0, 3],
  xiangjiang: ['xiangjiang', 3, 4],
  liping: ['liping', 4, 6],
  wujiang: ['wujiang', 6, 8],
  zunyi: ['zunyi', 7, 8],
  zhaxi: ['zhaxi', 8, 10],
  chishui: ['fourth', 10, 16],
  jinsha: ['jinsha', 16, 18],
  dadu: ['dadu', 18, 21],
  jiajin: ['jiajin', 21, 22],
  maogong: ['maogong', 22, 23],
  grassland: ['grassland', 23, 24],
  hadapu: ['hadapu', 24, 26],
  wuqi: ['wuqi', 26, 28],
  'other-routes': ['ganzi', 28, 28, 'other'],
  reunion: ['huining', 28, 28, 'meetings'],
};

const JOURNEY_LANDMARKS = [
  'yudu', 'xiangjiang', 'liping', 'zunyi', 'zhaxi', 'jinsha', 'dadu',
  'jiajin', 'maogong', 'grassland', 'hadapu', 'wuqi', 'sangzhi', 'hejia',
  'ganzi', 'huining', 'jiangtai', 'yongping',
];
