-- ============================================================
-- SQL SCRIPT: ระบบเปลี่ยนรหัสผ่านผู้ใช้งานโดย Admin สำหรับ Supabase
-- ก๊อปปี้คำสั่งนี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด RUN
-- ============================================================

-- สร้างฟังก์ชัน admin_set_user_password สำหรับเปลี่ยนรหัสผ่านใน auth.users โดยตรง
CREATE OR REPLACE FUNCTION public.admin_set_user_password(target_user_id UUID, new_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- อัปเดตรหัสผ่านใหม่แบบเข้ารหัส bcrypt ใน auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- มอบสิทธิ์การเรียกใช้งานฟังก์ชันแก่ authenticated และ anon
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated, anon, service_role;
