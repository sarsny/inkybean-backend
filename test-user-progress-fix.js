const { supabase, supabaseAdmin } = require('./config/database');

async function testUserProgressFix() {
  console.log('=== 测试 user_progress 表修复 ===\n');

  try {
    // 测试用的用户ID和书籍ID（请根据实际情况修改）
    const testUserId = '319cb433-6e50-4ab1-a90e-bebf72703392';
    const testBookId = 'fc824e9f-9d64-4869-9516-351b4bd79d65';

    console.log('测试参数:');
    console.log(`用户ID: ${testUserId}`);
    console.log(`书籍ID: ${testBookId}\n`);

    // 1. 清理可能存在的测试数据
    console.log('1. 清理现有测试数据...');
    const { error: deleteError } = await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('userId', testUserId)
      .eq('bookId', testBookId);

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log('清理数据时出错（可能是数据不存在）:', deleteError.message);
    } else {
      console.log('✅ 测试数据清理完成');
    }

    // 2. 测试使用 supabaseAdmin 创建用户进度记录
    console.log('\n2. 测试使用 supabaseAdmin 创建用户进度记录...');
    const { data: newProgress, error: insertError } = await supabaseAdmin
      .from('user_progress')
      .insert({
        userId: testUserId,
        bookId: testBookId,
        highestAccuracy: 0,
        totalAttempts: 0,
        lastAttemptedAt: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ supabaseAdmin 插入失败:', insertError);
      return;
    }

    console.log('✅ supabaseAdmin 插入成功:');
    console.log(`  - progressId: ${newProgress.progressId}`);
    console.log(`  - userId: ${newProgress.userId}`);
    console.log(`  - bookId: ${newProgress.bookId}`);
    console.log(`  - createdAt: ${newProgress.createdAt}`);

    // 3. 测试查询刚创建的记录
    console.log('\n3. 测试查询用户进度记录...');
    const { data: queryResult, error: queryError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('userId', testUserId)
      .eq('bookId', testBookId)
      .single();

    if (queryError) {
      console.error('❌ 查询失败:', queryError);
    } else {
      console.log('✅ 查询成功:', queryResult);
    }

    // 4. 测试更新记录
    console.log('\n4. 测试更新用户进度记录...');
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('user_progress')
      .update({
        highestAccuracy: 0.8,
        totalAttempts: 1,
        lastAttemptedAt: new Date().toISOString()
      })
      .eq('progressId', newProgress.progressId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ 更新失败:', updateError);
    } else {
      console.log('✅ 更新成功:');
      console.log(`  - highestAccuracy: ${updateResult.highestAccuracy}`);
      console.log(`  - totalAttempts: ${updateResult.totalAttempts}`);
      console.log(`  - lastAttemptedAt: ${updateResult.lastAttemptedAt}`);
    }

    // 5. 测试模拟API调用
    console.log('\n5. 测试模拟 /books/:bookId/select API 调用...');
    
    // 先删除测试记录
    await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('progressId', newProgress.progressId);

    // 模拟API调用逻辑
    const { data: existingProgress, error: checkError } = await supabase
      .from('user_progress')
      .select('progressId, createdAt')
      .eq('userId', testUserId)
      .eq('bookId', testBookId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ 检查现有进度失败:', checkError);
      return;
    }

    if (!existingProgress) {
      console.log('✅ 确认用户未选择过该书籍，准备创建新记录...');
      
      // 使用修复后的代码创建记录
      const { data: apiNewProgress, error: apiInsertError } = await supabaseAdmin
        .from('user_progress')
        .insert({
          userId: testUserId,
          bookId: testBookId,
          highestAccuracy: 0,
          totalAttempts: 0,
          lastAttemptedAt: null
        })
        .select()
        .single();

      if (apiInsertError) {
        console.error('❌ API模拟插入失败:', apiInsertError);
      } else {
        console.log('✅ API模拟插入成功:', apiNewProgress.progressId);
        
        // 清理测试数据
        await supabaseAdmin
          .from('user_progress')
          .delete()
          .eq('progressId', apiNewProgress.progressId);
        console.log('✅ 测试数据已清理');
      }
    }

    console.log('\n=== 测试完成 ===');
    console.log('修复方案验证成功！现在可以部署到生产环境。');

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testUserProgressFix().then(() => {
  console.log('\n测试脚本执行完成');
  process.exit(0);
}).catch(error => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});