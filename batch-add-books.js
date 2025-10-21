const axios = require('axios');
const fs = require('fs');

// 配置
const API_BASE_URL = 'http://localhost:3001';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3ZGYwOWI3Ny0yNjc5LTQ5OGYtYTA0Ny00Y2Q4ZWJmNGExMmEiLCJlbWFpbCI6InRlc3QyQHRlc3QuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlcjIiLCJpYXQiOjE3NjEwMTY2NDgsImV4cCI6MTc2MzYwODY0OH0.ggsSKdKYgORHLw0uBK0CG_miSMH1vv-PfI9oE24ORT0';

// 173本书籍数据
const books = [
  { title: '高效演讲', description: '一本真正教会你演讲的书' },
  { title: '幸福的方法', description: '能让你过的更幸福的一本书' },
  { title: '你就是孩子最好的玩具', description: '愿心中有爱的你成为了不起的父母' },
  { title: '斯坦福大学最受欢迎的创意课', description: '令你的工作和生活充满创新方法的一本书' },
  { title: '正念的奇迹', description: '修心不在念佛法，行住坐卧都是禅' },
  { title: '第3选择', description: '解决所有难题的关键思路' },
  { title: '孔子——人能弘道', description: '让你全面了解孔子的一本书' },
  { title: '金钱不能买什么', description: '金钱与公正的正面交锋' },
  { title: '管理十诫', description: '影响你一生的管理哲学' },
  { title: '游戏改变世界', description: '未来的商业模式，可能都跟游戏有关' },
  { title: '向前一步', description: '女性，工作及领导意志' },
  { title: '细节营销', description: '发现你所不知道的营销' },
  { title: '消除压力，从大脑开始', description: '不是战胜压力，而是消解压力...' },
  { title: '洗脑术：思想控制的荒唐史', description: '思想控制的荒唐史...' },
  { title: '僧侣与哲学家', description: '消除你对佛教的一切质疑' },
  { title: '怎样才是最好的学习', description: '人类与知识的美好互动...' },
  { title: '吸金广告', description: '史上最赚钱的文案写作手册' },
  { title: '活出生命的意义', description: '可以震撼灵魂的一本书' },
  { title: '叛逆不是孩子的错', description: '不打、不骂、不动气的温暖教养术' },
  { title: '钝感力', description: '具备不为小事动摇的钝感力，才能成为真正的赢家' },
  { title: '从0到1', description: '开启商业与未来的秘密' },
  { title: '透过佛法看世界', description: '给寻找答案的人' },
  { title: '联盟', description: '互联网时代的人才变革' },
  { title: '搞定', description: '无压工作的艺术' },
  { title: '巴菲特之道', description: '将巴菲特思想引进中国的一本书' },
  { title: '创客', description: '新工业革命缔造者' },
  { title: '特蕾莎修女：奇迹的故事', description: '全球所有人的精神粮食' },
  { title: '创业维艰', description: '如何完成比难更难的事' },
  { title: '解压全书：压力管理', description: '生活还有希望吗' },
  { title: '精神问题有什么可笑的', description: '你头脑里住着一匹狂野的怪兽，你造吗' },
  { title: '让孩子远离焦虑', description: '帮助孩子摆脱不安，害怕与恐惧的心理课' },
  { title: '次第花开', description: '重塑心灵的力量' },
  { title: '认同', description: '赢取支持的艺术' },
  { title: '零边际成本社会', description: '一个物联网、合作共赢的新经济时代' },
  { title: '一个广告人的自白', description: '广告史上对广告人影响最大的一本书' },
  { title: '支付战争（上）', description: '互联网金融创世纪（上）' },
  { title: '支付战争（下）', description: '互联网金融创世纪（下）' },
  { title: '终结拖延症', description: '' },
  { title: '故道白云', description: '与众不同的佛陀转机' },
  { title: '基因革命', description: '跑步、牛奶、童年经历如何改变我们的基因' },
  { title: '刀锋上的行走', description: '不一样的行走方式' },
  { title: '幸福的婚姻', description: '男人与女人的长期相处之道' },
  { title: '重新定义公司', description: '谷歌是如何运营' },
  { title: '关键对话', description: '如何高效能沟通，营造无往不利的事业和人生' },
  { title: '风流去', description: '鲍鹏山眼中的文化人物' },
  { title: '养育男孩', description: '培养积极、勇敢、有担当的男孩' },
  { title: '疯传', description: '让你的产品、思想、行为像病毒一样入侵' },
  { title: '大汗之国', description: '从古至今，西方眼中的中国' },
  { title: '孔子如来', description: '印证孔子智慧，传递正知正见' },
  { title: '最好的告别', description: '关于衰老与死亡，你必须知道的常识' },
  { title: '瞬变', description: '让改变轻松起来的九个方法' },
  { title: '让顾客自己来定价', description: '世界最盈利公司的创新定价策略' },
  { title: '情绪急救', description: '应对各种日常心理伤害的策略与方法' },
  { title: '如何培养孩子的社会能力', description: '教孩子学会解决冲突和与人相处的技巧' },
  { title: '哈佛商学院最受欢迎的领导课', description: '宏观层面的领导力' },
  { title: '视觉锤', description: '视觉时代的定位之道' },
  { title: '谁说商业直觉是天生的', description: '直觉是解决问题的最快方法' },
  { title: '王阳明大传', description: '知行合一的心学智慧' },
  { title: '我的情绪为何总被他人左右', description: '理性情绪行为疗法' },
  { title: '母爱的羁绊', description: '让母爱回归到爱最初的样子' },
  { title: '高绩效教练', description: '教练与领导领域首屈一指的畅销书' },
  { title: '颠覆性医疗革命', description: '一个颠覆性的医疗时代来临' },
  { title: '爱有8种习惯', description: '消除不安全感，让生命自由安宁' },
  { title: '共享经济', description: '重构未来商业新模式' },
  { title: '干法', description: '让你对工作充满干劲的一本书' },
  { title: '轻疗愈', description: '15分钟快速减压、实现身心平衡' },
  { title: '忙碌爸爸也能做好爸爸', description: '"好爸爸养成计划"——再忙也能做好爸爸' },
  { title: '人性中的善良天使', description: '暴力为什么会减少' },
  { title: '谷物大脑', description: '我们吃的谷物有可能损害大脑' },
  { title: '少即是多', description: '北欧自由生活意见' },
  { title: '养育女孩', description: '女孩父母必读养育指南' },
  { title: '正见：佛陀的证悟', description: '一本书道破佛学见地的核心' },
  { title: '商业的本质', description: '致敬工业时代，回归商业本质' },
  { title: '这书能让你戒烟', description: '掀起全球旋风的戒烟奇迹' },
  { title: '浪潮式发售', description: '热卖的产品发售方程式' },
  { title: '翻转式学习', description: '21世纪学习的革命' },
  { title: '爆款', description: '如何打造超级IP' },
  { title: '你要如何衡量你的人生', description: '给哈佛商学院毕业生最重要的一堂课' },
  { title: '梁漱溟先生讲孔孟（上）', description: '圣贤眼中的真正生活哲学（上）' },
  { title: '梁漱溟先生讲孔孟（下）', description: '圣贤眼中的真正生活哲学（下）' },
  { title: '如何说孩子才会听，怎么听孩子才肯说', description: '让忙碌的父母在最短的时间里学会与孩子亲密沟通' },
  { title: '演讲的力量', description: '如何让公众表达变成影响力' },
  { title: '非暴力沟通', description: '打开爱和理解的密码' },
  { title: '人类简史', description: '从动物到上帝，第十届文津奖获奖图书' },
  { title: '跑步圣经', description: '人天生就是跑步者，让本书伴你奔跑一生！' },
  { title: '我战胜了抑郁症', description: '九个抑郁症患者真实感人的自愈故事' },
  { title: '沃顿商学院最受欢迎的谈判课', description: '最高效的谈判秘籍' },
  { title: '你的生存本能正在杀死你', description: '为什么你容易焦虑、不安、恐慌和被激怒？' },
  { title: '你能写出好故事', description: '写作的诀窍、大脑的奥秘、认知的陷阱' },
  { title: '宽恕', description: '转化生命的疗愈之作' },
  { title: '翻转课堂的可汗学院', description: '互联时代的教育革命' },
  { title: '放弃的艺术', description: '勇敢的放弃带来更好的人生' },
  { title: '我想飞进天空', description: '在自闭症者的世界里，理解是最适当的陪伴' },
  { title: '销售就是要玩转情商', description: '99%的人都不知道的销售技巧' },
  { title: '离经叛道', description: '不按常理出牌的人如何改变世界' },
  { title: '童年的秘密', description: '风靡全球的蒙氏教育的经典著作，每一个父母必须了解的童年秘密' },
  { title: '医生的修炼', description: '在不完美中探索行医的真相' },
  { title: '匠人精神', description: '一流人才育成的30条法则' },
  { title: '刻意练习', description: '杰出不是一种天赋，而是一种人人都可以学会的技巧！' },
  { title: '感官品牌', description: '二流企业造产品，一流企业创品牌' },
  { title: '销售洗脑', description: '把逛街者变成购买者的8条黄金法则' },
  { title: '不吼不叫', description: '如何平静地让孩子与父母合作' },
  { title: '和繁重的工作一起修行', description: '平和喜乐地成就事业' },
  { title: '创始人', description: '新管理者如何度过第一个90天' },
  { title: '认知盈余', description: '自由时间的力量' },
  { title: '如何让你爱的人爱上你', description: '你相信吗？你爱的人一定会爱上你' },
  { title: '权力：为什么只为某些人所拥有', description: '权力是"争"来的，不是"等"来的' },
  { title: '王阳明哲学', description: '勾勒阳明思想历程，阐释心学' },
  { title: '未来简史', description: '从人类如何胜出，到人类的未来危机' },
  { title: '危机领导力', description: '掌握10大关键策略，让你的团队抗得过危机' },
  { title: '丝绸之路', description: '一部全新的世界史' },
  { title: '指数型组织', description: '打造独角兽公司的11个最强属性' },
  { title: '终极健康', description: '一个人对完美身体的谦卑追求' },
  { title: '中国八大诗人', description: '跟大师学国学' },
  { title: '正面管教', description: '如何不惩罚、不娇纵地有效管教孩子' },
  { title: '国史讲话：春秋', description: '2015中国好书' },
  { title: '人工智能时代', description: '人机共生下财富、工作与思维的大未来' },
  { title: '亲密关系', description: '通往灵魂桥梁' },
  { title: '流放的老国王', description: '走进阿尔兹海默患者被流放的孤独领域' },
  { title: '硅谷钢铁侠', description: '埃隆·马斯克的冒险人生' },
  { title: '关键冲突', description: '如何化人际关系为合作共赢' },
  { title: '心里医生为什么没有告诉我', description: '全世界100本焦虑治疗畅销书排行第一' },
  { title: '让大象飞', description: '激进创新，让你一飞冲天的创业术' },
  { title: '自卑与超越', description: '改变全球千万人命运的心理经典，白岩松推荐' },
  { title: '中国哲学简史（上）', description: '畅销全球半世纪的中国哲学入门书' },
  { title: '中国哲学简史（下）', description: '读懂儒释道思想精髓与变迁' },
  { title: '裂变式创业', description: '帮助传统企业找到通往财富之路' },
  { title: '爸爸军团', description: '身患癌症后爸爸给女儿的十个礼物' },
  { title: '精益创业', description: '风靡全球的创业思潮，李开复作序推荐' },
  { title: '为什么有的人特别招蚊子', description: '爸妈也能秒懂的微生物科普读物' },
  { title: '当良知沉睡', description: '辨认身边的反社会人格者' },
  { title: '关键期关键帮助', description: '0-6岁孩子家长的养育解惑圣经' },
  { title: '魏晋风华', description: '轻松读懂【世说新语】' },
  { title: '极致', description: '互联网时代的产品设计' },
  { title: '少有人走的路', description: '关于爱与自律，你必须知道的事' },
  { title: '为未知而教，为未来而学', description: '以"未来智慧"的视角看待教育' },
  { title: '名创优品没有秘密', description: '零售业出奇制胜的秘诀' },
  { title: '身心合一的奇迹力量', description: '高手对决时的制胜心理秘密' },
  { title: '上瘾', description: '习惯养成类产品背后的设计秘诀' },
  { title: '世界如锦心如梭', description: '毕淑敏环球之旅文化地理游记' },
  { title: '得民心的天下：王蒙说《孟子》', description: '王蒙先生新作，深度挖掘孟子的微言大义' },
  { title: '创新与企业家精神', description: '管理学大师彼得·德鲁克经典作品' },
  { title: '心的重建', description: '如何走出伤痛的疗愈宝典' },
  { title: '怕死：人类行为的驱动力', description: '揭示人类行为的根本驱动力' },
  { title: '跃迁：成为高手的技术', description: '揭秘高手是如何快速成长的' },
  { title: '叶檀理财课', description: '会理财，享生活' },
  { title: '清单革命', description: '如何持续、正确、安全地把事情做好' },
  { title: '创业者的窘境', description: '如何在创新里少跌跟头，少犯错' },
  { title: '颠覆者：周鸿祎自传', description: '一本书读懂互联网大佬和他在的江湖' },
  { title: '思考，快与慢', description: '为你打开非理性世界的大门' },
  { title: '睡眠革命', description: '从掌控睡眠开始，优化你的人生效率' },
  { title: '可复制的领导力', description: '轻松掌握领导力、打造核心竞争力' },
  { title: '好妈妈胜过好老师', description: '一个教育专家16年的教子手记' },
  { title: '穷查理宝典', description: '查理·芒格智慧箴言录' },
  { title: '一念之差', description: '生活风险无处不在，如何从容应对' },
  { title: '反脆弱', description: '脆弱的反面不是坚强，是反脆弱' },
  { title: '这不是你的错', description: '探索隐藏在核心语言中的家族宿命' },
  { title: '人生效率手册', description: '任何卓有成效地过好每一天' },
  { title: '深度工作', description: '如何有效使用每一点脑力' },
  { title: '内向孩子的潜在优势', description: '成为一个更好的内向者' },
  { title: '我们终将遇见爱与孤独', description: '如何成为一个内心强大的人' },
  { title: '生活的哲学', description: '12位先哲帮你寻找的人生意义' },
  { title: '赋能', description: '用美军经验打造超级团队' },
  { title: '他人的力量', description: '被忽视的真相：人际关系的力量' },
  { title: '身体从未忘记', description: '让破碎的心重归宁静' },
  { title: '新零售的未来', description: '零售连锁巨头的进化之道' },
  { title: '心流', description: '让你幸福感翻倍的科学' },
  { title: 'OKR工作法', description: '带你聚焦目标，全力以赴' },
  { title: '寻人不遇', description: '用最温柔的方式滋养你的强大' },
  { title: '增长黑客', description: '低成本实现爆发式' },
  { title: '数据思维', description: '大数据的生财之道' },
  { title: '终身成长', description: '重塑理想人生的秘密' },
  { title: '婵的行囊', description: '跟随这本妙趣横生的行走笔记，完成一次心灵的朝圣' },
  { title: '谢谢你迟到', description: '加速时代，更要学会暂停。暂停，才能积蓄更大的能量' },
  { title: '每个人的战争', description: '人和癌症的战争，就是和自己的战争，愿你掌握生活主动权' },
  { title: '经营者养成笔记', description: '人人都在经营，但唯有取得成果，才算真正的经营' },
  { title: '我们如何走到今天', description: '文明出人意料的转折，不可追，但尤可回味' },
  { title: '即兴演讲', description: '告别说话语无伦次、没重点，让你在任何场合游刃有余地表达' },
  { title: '终身学习：哈佛毕业后的六堂课', description: '人生的六堂必修课，斯坦福和哈佛没有教！' },
  { title: '商战', description: '超越可口可乐只用了6年？"定位之父"教你打赢商战' },
  { title: '老子、孔子、墨子及其学派', description: '走近梁启超笔下的诸子百家' }
];

// 添加书籍的函数
async function addBook(book, index) {
  try {
    console.log(`[${index + 1}/${books.length}] 正在添加: ${book.title}`);
    
    const response = await axios.post(`${API_BASE_URL}/books`, {
      title: book.title
    }, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });

    if (response.status === 201) {
      console.log(`✅ 成功添加: ${book.title}`);
      return { success: true, book: response.data.book };
    } else {
      console.log(`⚠️  意外状态码 ${response.status}: ${book.title}`);
      return { success: false, error: `状态码: ${response.status}` };
    }
  } catch (error) {
    if (error.response) {
      // 服务器返回了错误响应
      const errorMsg = error.response.data?.error || error.response.statusText;
      console.log(`❌ 添加失败: ${book.title} - ${errorMsg}`);
      return { success: false, error: errorMsg };
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.log(`❌ 网络错误: ${book.title} - 请求超时或网络不可达`);
      return { success: false, error: '网络错误' };
    } else {
      // 其他错误
      console.log(`❌ 未知错误: ${book.title} - ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主函数
async function main() {
  console.log(`开始批量添加 ${books.length} 本书籍...`);
  console.log('='.repeat(50));
  
  const results = {
    success: [],
    failed: [],
    total: books.length
  };

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const result = await addBook(book, i);
    
    if (result.success) {
      results.success.push({
        title: book.title,
        bookId: result.book?.bookId
      });
    } else {
      results.failed.push({
        title: book.title,
        error: result.error
      });
    }
    
    // 每次请求后等待2秒，避免过于频繁的请求
    if (i < books.length - 1) {
      console.log('等待2秒后继续...');
      await delay(2000);
    }
  }
  
  // 输出统计结果
  console.log('\n' + '='.repeat(50));
  console.log('批量添加完成！');
  console.log(`总计: ${results.total} 本书籍`);
  console.log(`成功: ${results.success.length} 本`);
  console.log(`失败: ${results.failed.length} 本`);
  
  if (results.failed.length > 0) {
    console.log('\n失败的书籍:');
    results.failed.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title} - ${item.error}`);
    });
  }
  
  // 保存结果到文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `batch-add-results-${timestamp}.json`;
  
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n详细结果已保存到: ${resultFile}`);
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { addBook, books };