# Portal de Produtividade Integrado

Aplicativo web simples para gerenciar tarefas, notas, timer, finanças básicas e player de música. Projetado para uso local e publicado via GitHub Pages.

## Conteúdo do repositório
- `index.html` — página principal (contém a interface).
- `script.js` — lógica JavaScript do aplicativo.
- `icone.png` — ícone do aplicativo (usado na interface).
- `README.md` — este arquivo.

## Recursos
- Lista de tarefas salva no localStorage.
- Editor de notas com salvamento local.
- Timer (Pomodoro e presets).
- Controle simples de finanças (entradas/saídas) persistente no navegador.
- Player de áudio básico (carregar arquivo local).
- Publicação via GitHub Pages.

## Instalação (local)
1. Clone o repositório ou baixe os arquivos:
   git clone https://github.com/SEU_USUARIO/NOME_DO_REPO.git
2. Abra `index.html` em um navegador moderno (Chrome, Firefox, Edge).

Obs.: Não são necessárias dependências; tudo roda localmente no navegador.

## Publicar com GitHub Pages
1. Certifique-se de que `index.html` está na raiz do repositório.
2. No GitHub, vá em Settings → Pages (ou Settings → Code and automation → Pages).
3. Em "Build and deployment", selecione "Deploy from a branch".
4. Escolha a branch `main` (ou `master`) e a pasta `/ (root)`, clique em Save.
5. Aguarde alguns minutos e acesse a URL indicada (ex: `https://SEU_USUARIO.github.io/NOME_DO_REPO/`).

## Uso
- Todos os dados são salvos localmente no navegador (localStorage). Ao limpar o cache/dados do navegador, os dados serão perdidos.
- Para alterar o ícone, substitua `icone.png` por outro arquivo com o mesmo nome (ou ajuste o caminho em `index.html`).

## Contribuições
Pull requests são bem-vindos. Abra uma issue para sugerir melhorias ou reportar bugs.

## Licença
Use conforme desejar — se quiser adicionar uma licença explícita, crie um arquivo `LICENSE` com a licença escolhida (por exemplo MIT).

