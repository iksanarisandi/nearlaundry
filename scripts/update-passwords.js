const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('laundry123', 10);
console.log('Hash untuk password laundry123:');
console.log(hash);
console.log('\nSQL command:');
console.log(`UPDATE users SET password_hash = '${hash}';`);
