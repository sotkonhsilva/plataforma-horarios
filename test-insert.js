import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: colabs } = await supabase.from('colaboradores').select('id').limit(1);
  if (!colabs || colabs.length === 0) return console.log('No colabs');
  const colabId = colabs[0].id;
  
  const payload = {
    collaborator_id: colabId,
    date: '2026-06-03',
    start_time: '14:00',
    end_time: '20:00',
    location: 'Pólo 1'
  };
  
  const { error } = await supabase.from('escalas').insert([payload]);
  console.log('Error insert 1:', error?.message);

  const payload2 = {
    colaborador_id: colabId,
    data: '2026-06-03',
    hora_entrada: '14:00',
    hora_saida: '20:00',
    localizacao: 'Pólo 1'
  };
  const { error: error2 } = await supabase.from('escalas').insert([payload2]);
  console.log('Error insert 2:', error2?.message);
}
test();
