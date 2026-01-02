-- Script untuk cek duplikat nota_number per outlet dan process
-- Jalankan ini SEBELUM migrasi untuk memastikan tidak ada data yang conflict

SELECT 
  outlet_id,
  nota_number,
  process,
  COUNT(*) as jumlah_duplikat,
  GROUP_CONCAT(id) as id_list
FROM production
GROUP BY outlet_id, nota_number, process
HAVING COUNT(*) > 1
ORDER BY outlet_id, nota_number, process;
