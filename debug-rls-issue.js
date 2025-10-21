const { supabase, supabaseAdmin } = require('./config/database');

async function debugRLSIssue() {
  console.log('=== 调试 user_progress 表 RLS 策略问题 ===\n');

  try {
    // 1. 检查 user_progress 表是否存在
    console.log('1. 检查 user_progress 表结构...');
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'user_progress')
      .eq('table_schema', 'public');

    if (tableError) {
      console.error('查询表信息失败:', tableError);
      return;
    }

    if (!tableInfo || tableInfo.length === 0) {
      console.log('❌ user_progress 表不存在');
      return;
    }

    console.log('✅ user_progress 表存在');

    // 2. 检查表的列结构
    console.log('\n2. 检查表列结构...');
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'user_progress')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (columnsError) {
      console.error('查询列信息失败:', columnsError);
    } else {
      console.log('表列结构:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
    }

    // 3. 检查 RLS 是否启用
    console.log('\n3. 检查 RLS 状态...');
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin.rpc('check_rls_status', {
      table_name: 'user_progress'
    });

    if (rlsError) {
      console.log('无法通过RPC检查RLS状态，尝试直接查询...');
      
      // 尝试直接查询系统表
      const { data: pgClass, error: pgError } = await supabaseAdmin
        .from('pg_class')
        .select('relname, relrowsecurity')
        .eq('relname', 'user_progress');

      if (pgError) {
        console.error('查询pg_class失败:', pgError);
      } else if (pgClass && pgClass.length > 0) {
        console.log(`RLS 状态: ${pgClass[0].relrowsecurity ? '启用' : '禁用'}`);
      }
    } else {
      console.log('RLS 状态:', rlsStatus);
    }

    // 4. 检查现有的 RLS 策略
    console.log('\n4. 检查 RLS 策略...');
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname, cmd, permissive, roles, qual, with_check')
      .eq('tablename', 'user_progress');

    if (policiesError) {
      console.error('查询策略失败:', policiesError);
    } else {
      if (policies && policies.length > 0) {
        console.log('现有策略:');
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
          console.log(`    permissive: ${policy.permissive}`);
          console.log(`    roles: ${policy.roles}`);
          console.log(`    qual: ${policy.qual}`);
          console.log(`    with_check: ${policy.with_check}`);
          console.log('');
        });
      } else {
        console.log('❌ 没有找到 RLS 策略');
      }
    }

    // 5. 尝试使用 supabaseAdmin 插入数据（应该成功）
    console.log('\n5. 测试 supabaseAdmin 插入...');
    const testUserId = '319cb433-6e50-4ab1-a90e-bebf72703392'; // 从日志中的用户ID
    const testBookId = 'fc824e9f-9d64-4869-9516-351b4bd79d65'; // 从日志中的书籍ID

    const { data: adminInsert, error: adminError } = await supabaseAdmin
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

    if (adminError) {
      console.error('❌ supabaseAdmin 插入失败:', adminError);
    } else {
      console.log('✅ supabaseAdmin 插入成功:', adminInsert);
      
      // 清理测试数据
      await supabaseAdmin
        .from('user_progress')
        .delete()
        .eq('progressId', adminInsert.progressId);
      console.log('✅ 测试数据已清理');
    }

    // 6. 检查用户是否存在
    console.log('\n6. 检查用户是否存在...');
    const { data: userExists, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('id', testUserId)
      .single();

    if (userError) {
      console.error('❌ 查询用户失败:', userError);
    } else {
      console.log('✅ 用户存在:', userExists);
    }

    // 7. 检查书籍是否存在
    console.log('\n7. 检查书籍是否存在...');
    const { data: bookExists, error: bookError } = await supabaseAdmin
      .from('books')
      .select('bookId, title, isPublished')
      .eq('bookId', testBookId)
      .single();

    if (bookError) {
      console.error('❌ 查询书籍失败:', bookError);
    } else {
      console.log('✅ 书籍存在:', bookExists);
    }

  } catch (error) {
    console.error('调试过程中发生错误:', error);
  }
}

// 运行调试
debugRLSIssue().then(() => {
  console.log('\n=== 调试完成 ===');
  process.exit(0);
}).catch(error => {
  console.error('调试失败:', error);
  process.exit(1);
});