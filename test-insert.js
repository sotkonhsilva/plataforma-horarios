import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nnoqjxfuoobcoyqjkidj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ub3FqeGZ1b29iY295cWpraWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzIxNjMsImV4cCI6MjA5Njg0ODE2M30.Il8HHAhnW7I_kaAcScEfmmOhv57B2fV5K1ZfdiWTVQk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('colaboradores').insert([{
    name: 'Test',
    role: 'Colaborador',
    email: 'test@test.com'
  }]).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
