# Manual do Administrador - Plataforma de Horários Psiporto

Bem-vindo ao manual de administração da nova plataforma de gestão de horários da Psiporto. Este documento serve como guia de referência rápida para todas as operações que pode realizar enquanto Administrador.

---

## 1. Gestão de Localizações (Pólos)

Antes de criar os horários dos colaboradores, é recomendável garantir que tem todas as localizações criadas.

**Como criar uma nova localização:**
1. Aceda à vista de **Administração** através do botão no canto superior direito.
2. Desça até à secção "Gestão de Localizações".
3. Escreva o nome do novo pólo de trabalho (ex: "Pólo 3 - Baixa") e clique em **"Adicionar"**.
4. Esta localização ficará imediatamente disponível em todos os formulários da plataforma.

*(Nota: Pode também eliminar localizações que já não estejam em uso clicando no ícone do caixote do lixo, exceto aquelas que já estejam atribuídas a turnos ativos).*

---

## 2. Gestão de Colaboradores e Acessos

O processo de entrada de um novo membro na equipa é feito de forma totalmente centralizada.

**Como criar um novo Colaborador:**
1. No topo da plataforma, clique no botão azul **"+ Novo Colaborador"**.
2. Preencha os dados pessoais (Nome, Email e Função).
3. **Palavra-Passe Inicial:** Defina uma password temporária (mínimo de 6 caracteres). Esta é a password que vai facultar ao colaborador no primeiro dia.
4. Clique em **"Guardar Perfil"**.

O sistema irá automaticamente criar a ficha de horários do colaborador e a sua conta oficial e segura na base de dados (Supabase). O colaborador pode entrar imediatamente usando o seu email e a password que definiu.

---

## 3. Definição de Turnos Padrão

Na mesma ficha do Colaborador, pode (e deve) definir os seus **Blocos de Trabalho Padrão**.

- A plataforma carrega por defeito o horário das 09:00 às 13:00 e das 14:00 às 20:00.
- Pode alterar estas horas e associar cada um destes blocos a uma **Localização Base** (ex: Manhã no Pólo 1, Tarde no Pólo 2).
- Estes turnos vão propagar-se automaticamente por todo o calendário do colaborador (de Segunda a Sexta), ignorando Sábados, Domingos e Feriados Nacionais.

---

## 4. Gestão da Vista Mensal e Exceções

A Vista Mensal (Calendário) é a ferramenta principal de visualização.

**Como ler o Calendário:**
- Cada célula representa um dia do mês.
- **Fundo Cinzento:** Fim de semana.
- **Fundo Amarelo:** Feriado Nacional de Portugal (com o nome do feriado a vermelho).
- As "bolinhas" representam cada turno de um colaborador, com as suas iniciais, coloridas automaticamente para fácil reconhecimento.

**Como criar uma Exceção (Alteração Manual):**
Se um colaborador precisar de trocar um turno num dia específico (ou for convocado para trabalhar a um Sábado):
1. No Calendário, clique no dia pretendido.
2. Na janela que abre, escolha o Colaborador que pretende alterar.
3. Se ele já tiver o horário padrão nesse dia, clique em **"Ajustar Horário"**.
4. Terá acesso a um painel onde pode modificar as horas, alterar o pólo, adicionar turnos extra ou remover turnos desse dia.
5. Quando uma alteração manual é feita, a "bolinha" do colaborador no calendário ganha uma **argola laranja brilhante**, para sinalizar ao Administrador que aquele dia tem uma exceção ao horário normal.

---

## 5. Navegação e Filtros

Para equipas grandes, a Vista Mensal inclui **Filtros Inteligentes** no menu superior direito (ao lado do botão Calendário):
- **Colaboradores:** Permite isolar a visualização para um ou vários colaboradores.
- **Localizações:** Permite visualizar apenas os turnos alocados a uma clínica/pólo específico.
Estes filtros podem ser combinados entre si. Ao ativar um filtro, o Calendário esconde tudo o que não interessa em tempo real.

---

## 6. Recuperação de Acessos

Se um colaborador se esquecer da sua Palavra-Passe, o Administrador **não precisa** de criar uma nova.
A plataforma foi desenhada para promover a autonomia:

1. O Colaborador vai à página de Login e clica em **"Esqueceu-se da palavra-passe?"**.
2. Insere o seu email e clica em "Enviar Link de Recuperação".
3. O sistema envia-lhe um email automático (do Supabase) com um link seguro.
4. Ao clicar no link do email, o colaborador regressa à plataforma, que o obriga automaticamente a escrever uma nova password segura, garantindo total privacidade.

---

*Manual gerado a 16 de Junho de 2026.*
