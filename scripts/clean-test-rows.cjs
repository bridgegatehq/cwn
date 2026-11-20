const Database=require('better-sqlite3');
const db=new Database('data/civic_watch.sqlite');
const p=db.prepare("DELETE FROM community_posts WHERE author_name = 'Verification citizen'").run();
const b=db.prepare("DELETE FROM bot_subscriptions WHERE handle = '@kano_watch'").run();
const d=db.prepare("DELETE FROM bot_digests WHERE subscription_id NOT IN (SELECT id FROM bot_subscriptions)").run();
const ps=db.prepare("DELETE FROM push_subscriptions WHERE endpoint LIKE '%push.example.test%'").run();
const dl=db.prepare("DELETE FROM push_delivery_log WHERE subscription_id NOT IN (SELECT id FROM push_subscriptions)").run();
console.log('removed', {posts:p.changes, subs:b.changes, digests:d.changes, pushSubs:ps.changes, pushLog:dl.changes});
console.log('remaining posts:', db.prepare('SELECT COUNT(*) c FROM community_posts').get().c, 'bot subs:', db.prepare('SELECT COUNT(*) c FROM bot_subscriptions').get().c, 'push subs:', db.prepare('SELECT COUNT(*) c FROM push_subscriptions').get().c);
