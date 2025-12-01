const bcrypt = require('bcryptjs');
(async () => {
  const hash = await bcrypt.hash('laundry123', 10);
  console.log(hash);
})();
