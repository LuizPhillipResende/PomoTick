    import bodyParser from 'body-parser';
import {User, Todo, Kanban, Jam} from './app/schemas/user.js';
    import express from 'express';
    import bcrypt from 'bcryptjs';
    require("dotenv").config();
    import hasAccess from './app/middlewares/hasAccess.js';
    import session from 'express-session';  

    const app = express();
    const port = process.env.PORT || 3000;

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));


    // Usando o arquivo ejs
    app.set("view engine", 'ejs');

    // Usando os arquivos da pasta public
    app.use(express.static("public"));

    //criar sessão com frase
    app.use(session({
        secret: 'palmeiras-sem-mundial',
        resave: false,
        saveUninitialized: true
    }));

    //renderizar login
    app.get("/", (req, res) => {
        res.render("login");
    });

    //renderizar cadastro
    app.get("/signup", (req, res) => {
        res.render("signup");
    });

    //renderizar admin
    app.get("/admin", async (req, res) => {
        const email = req.session.User.email;
        const isAdminUser = await User.findOne({email});

        if(isAdminUser && isAdminUser.hasAccess('admin')){
            res.render("admin");
        }else{
            res.render("home");
        }
    });

    //renderizar home
    app.get("/home", async (req, res) => {
        const email = req.session.User.email;
        const isAdminUser = await User.findOne({email});

        if(isAdminUser && isAdminUser.hasAccess('user')){
            res.render("home");
        }else{
            res.render("login");
        }
    });

    //registrar usuario
    app.post("/signup", async (req, res) => {
        try {
            const {name, email, password, role} = req.body;
            
            if (!name || !email || !password) {
                return res.status(400).json({success: false, message: 'Preencha todos os campos obrigatórios.'});
            }

            if (password.length < 6) {
                return res.status(400).json({success: false, message: 'Senha deve ter no mínimo 6 caracteres.'});
            }
            
            const verifyUser = await User.findOne({email});
            if (verifyUser) {
                return res.status(409).json({success: false, message: 'Este email já está cadastrado. Faça login ou use outro email.'});
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const userData = await User.create({name, email, password: hashedPassword, role: role || 'user'});
            
            return res.status(201).json({success: true, message: 'Cadastro realizado com sucesso! Faça login para continuar.'});
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            return res.status(500).json({success: false, message: 'Erro ao processar cadastro. Tente novamente.'});
        }
    })

    app.post("/home", async (req, res) => {
        try {
            const {email, password} = req.body;

            if (!email || !password) {
                return res.status(400).json({success: false, message: 'Email e senha são obrigatórios.'});
            }

            const foundUser = await User.findOne({email});
            if (!foundUser) {
                return res.status(401).json({success: false, message: 'Email ou senha incorretos.'});
            }

            if (!foundUser.hasAccess('user')) {
                return res.status(403).json({success: false, message: 'Sua conta não tem permissão para acessar.'});
            }

            const isPassMatch = await bcrypt.compare(password, foundUser.password);
            if (!isPassMatch) {
                return res.status(401).json({success: false, message: 'Email ou senha incorretos.'});
            }

            req.session.User = foundUser;
            return res.json({success: true, message: 'Login realizado com sucesso!'});
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return res.status(500).json({success: false, message: 'Erro ao efetuar login. Tente novamente.'});
        }
    });

    app.post('/saveUserData', async (req, res) => {
        if(!req.session.User){
            return res.status(401).json({sucess: false, error: "Usuario não identificado!"});
        }

        const email = req.session.User.email;
        const {todoList, checked, relatorio, display} = req.body;
    
        try {
          const todo = await Todo.findOneAndUpdate({ email }, { todoList, checked, relatorio, }, { upsert: true, new: true });
          res.json({ success: true, todo });
        } catch (error) {
          res.json({ success: false, error: error.message });
        }
      });

       //verificando dados do usuario e enviando pra homepage
      app.get('/loadUserData', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }
    
        const email = req.session.User.email;
    
        try {
            const userData = await User.findOne({email});
            const todo = await Todo.findOne({ email });
            res.json({ success: true, todo: todo || { todoList: [] }, userData });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    async function refreshJamState(jam) {
        if (!jam || !jam.running || !jam.targetAt) {
            return jam;
        }

        const now = new Date();
        let changed = false;
        while (jam.running && jam.targetAt && now >= jam.targetAt) {
            changed = true;
            const nextPhase = jam.phase === 'work' ? 'rest' : 'work';
            const nextDuration = nextPhase === 'work' ? jam.duration : jam.restDuration;
            jam.phase = nextPhase;
            jam.targetAt = new Date(jam.targetAt.getTime() + nextDuration * 1000);
        }

        if (changed) {
            jam.updatedAt = new Date();
            await jam.save();
        }
        return jam;
    }

    function buildJamStateView(jam) {
        if (!jam) {
            return null;
        }
        const now = new Date();
        const remaining = jam.running && jam.targetAt ? Math.max(0, Math.round((jam.targetAt - now) / 1000)) : 0;
        return {
            code: jam.code,
            ownerEmail: jam.ownerEmail,
            members: jam.members,
            duration: jam.duration,
            restDuration: jam.restDuration,
            phase: jam.phase,
            running: jam.running,
            remaining,
        };
    }

    app.post('/jam/create', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }

        const code = (req.body.code || '').trim().toUpperCase();
        const duration = Math.max(1, Math.min(60, Number(req.body.duration) || 25)) * 60;
        const restDuration = Math.max(1, Math.min(30, Number(req.body.restDuration) || 5)) * 60;

        if (!code) {
            return res.status(400).json({ success: false, error: 'Código do Jam é obrigatório.' });
        }

        try {
            const existingJam = await Jam.findOne({ code });
            if (existingJam) {
                return res.status(400).json({ success: false, error: 'Já existe um jam com este código. Use outro código ou entre no jam existente.' });
            }

            const jam = new Jam({
                code,
                ownerEmail: req.session.User.email,
                members: [req.session.User.email],
                duration,
                restDuration,
                phase: 'work',
                running: false,
            });

            await jam.save();
            res.json({ success: true, jam: buildJamStateView(jam) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/jam/join', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }

        const code = (req.body.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({ success: false, error: 'Código do Jam é obrigatório.' });
        }

        try {
            const jam = await Jam.findOne({ code });
            if (!jam) {
                return res.status(404).json({ success: false, error: 'Jam não encontrado.' });
            }

            if (!jam.members.includes(req.session.User.email)) {
                jam.members.push(req.session.User.email);
                jam.updatedAt = new Date();
                await jam.save();
            }

            await refreshJamState(jam);
            res.json({ success: true, jam: buildJamStateView(jam) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/jam/state', async (req, res) => {
        const code = (req.query.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({ success: false, error: 'Código do Jam é obrigatório.' });
        }

        try {
            const jam = await Jam.findOne({ code });
            if (!jam) {
                return res.status(404).json({ success: false, error: 'Jam não encontrado.' });
            }

            await refreshJamState(jam);
            res.json({ success: true, jam: buildJamStateView(jam) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/jam/start', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }
        const code = (req.body.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({ success: false, error: 'Código do Jam é obrigatório.' });
        }

        try {
            const jam = await Jam.findOne({ code });
            if (!jam) {
                return res.status(404).json({ success: false, error: 'Jam não encontrado.' });
            }

            if (!jam.members.includes(req.session.User.email)) {
                return res.status(403).json({ success: false, error: 'Você precisa entrar no jam antes de iniciar o cronômetro.' });
            }

            if (!jam.running) {
                const duration = Math.max(1, Math.min(60, Number(req.body.duration) || jam.duration / 60)) * 60;
                const restDuration = Math.max(1, Math.min(30, Number(req.body.restDuration) || jam.restDuration / 60)) * 60;
                jam.duration = duration;
                jam.restDuration = restDuration;
                jam.phase = 'work';
                jam.running = true;
                jam.targetAt = new Date(Date.now() + duration * 1000);
                jam.updatedAt = new Date();
                await jam.save();
            }

            await refreshJamState(jam);
            res.json({ success: true, jam: buildJamStateView(jam) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/jam/stop', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }
        const code = (req.body.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({ success: false, error: 'Código do Jam é obrigatório.' });
        }

        try {
            const jam = await Jam.findOne({ code });
            if (!jam) {
                return res.status(404).json({ success: false, error: 'Jam não encontrado.' });
            }

            if (!jam.members.includes(req.session.User.email)) {
                return res.status(403).json({ success: false, error: 'Você não faz parte deste jam.' });
            }

            jam.running = false;
            jam.targetAt = null;
            jam.updatedAt = new Date();
            await jam.save();
            res.json({ success: true, jam: buildJamStateView(jam) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/loadTodoDataAdmin', async (req, res) => {
        if (!req.query.email) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }
        const email = req.query.email;
        console.log(email);

        try {
            const todo = await Todo.findOne({ email });
            res.json({ success: true, todo });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    })

    app.put('/updateUser', async (req, res) => {
        if (!req.query._id) {
            return res.status(400).json({ success: false, error: 'ID do usuário é obrigatório' });
        }
    
        const _id = req.query._id;
        const {name, email, role} = req.body;

        try {
            const existingUser = await User.findOne({_id});
            if (!existingUser) {
                return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
            }

            const emailNow = existingUser.email;
            await User.findOneAndUpdate({_id}, {name, email, role});
            await Todo.findOneAndUpdate({email: emailNow}, {email});
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    

    app.delete('/deleteUser', async (req, res) => {
        const email = req.query.email;

        try {
            const result = await User.deleteOne({ email });

            if (result.deletedCount > 0) {
                res.json({ success: true, message: 'Usuário excluído com sucesso.' });
            } else {
                res.json({ success: false, error: 'Nenhum usuário encontrado' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/loadAllUserData', async (req, res) => {
        try {
            const allUsers = await User.find({});
    
            const allTodos = await Todo.find({});
    
            res.json({ success: true, allUsers, allTodos });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/profile', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({success: false, error: 'Usuário não identificado!'});
        }
        try {
            const user = await User.findOne({email: req.session.User.email});
            if (!user) {
                return res.status(404).json({success: false, error: 'Usuário não encontrado'});
            }
            const {password, ...profile} = user.toObject();
            res.json({success: true, profile});
        } catch (error) {
            res.status(500).json({success: false, error: error.message});
        }
    });

    app.post('/profile/update', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({success: false, error: 'Usuário não identificado!'});
        }
        const {name, bio} = req.body;
        try {
            const updated = await User.findOneAndUpdate(
                {email: req.session.User.email},
                {name, bio},
                {new: true}
            );
            req.session.User = updated;
            res.json({success: true, profile: {name: updated.name, bio: updated.bio, email: updated.email}});
        } catch (error) {
            res.status(500).json({success: false, error: error.message});
        }
    });

    app.post('/profile/picture', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({success: false, error: 'Usuário não identificado!'});
        }
        const {pictureData} = req.body;
        if (!pictureData || !pictureData.startsWith('data:image')) {
            return res.status(400).json({success: false, error: 'Foto inválida.'});
        }
        try {
            const updated = await User.findOneAndUpdate(
                {email: req.session.User.email},
                {profilePicture: pictureData},
                {new: true}
            );
            res.json({success: true, profilePicture: updated.profilePicture});
        } catch (error) {
            res.status(500).json({success: false, error: error.message});
        }
    });

    app.post('/kanban/create', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({success: false, error: 'Usuário não identificado!'});
        }
        const {title, description} = req.body;
        if (!title) {
            return res.status(400).json({success: false, error: 'Título do kanban é obrigatório.'});
        }
        try {
            let kanban = await Kanban.findOne({email: req.session.User.email});
            if (!kanban) {
                kanban = await Kanban.create({email: req.session.User.email, kanbanBoards: []});
            }
            const newBoard = {
                id: Date.now().toString(),
                title,
                description: description || '',
                columns: [
                    {id: 'col1', title: 'A Fazer', cards: []},
                    {id: 'col2', title: 'Fazendo', cards: []},
                    {id: 'col3', title: 'Concluído', cards: []}
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            kanban.kanbanBoards.push(newBoard);
            await kanban.save();
            res.json({success: true, board: newBoard});
        } catch (error) {
            res.status(500).json({success: false, error: error.message});
        }
    });

    app.get('/kanban/list', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({success: false, error: 'Usuário não identificado!'});
        }
        try {
            const kanban = await Kanban.findOne({email: req.session.User.email});
            res.json({success: true, boards: kanban ? kanban.kanbanBoards : []});
        } catch (error) {
            res.status(500).json({success: false, error: error.message});
        }
    });

    app.post('/kanban/card/add', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({success: false, error: 'Usuário não identificado!'});
        }
        const {boardId, columnId, title, description, priority} = req.body;
        if (!boardId || !columnId || !title) {
            return res.status(400).json({success: false, error: 'Dados incompletos para criar card.'});
        }
        try {
            const kanban = await Kanban.findOne({email: req.session.User.email});
            const board = kanban.kanbanBoards.id(boardId);
            const column = board.columns.id(columnId);
            const newCard = {
                id: Date.now().toString(),
                title,
                description: description || '',
                priority: priority || 'medium',
                dueDate: null,
                assignee: req.session.User.name,
                tags: [],
                createdAt: new Date()
            };
            column.cards.push(newCard);
            board.updatedAt = new Date();
            await kanban.save();
            res.json({success: true, card: newCard});
        } catch (error) {
            res.status(500).json({success: false, error: error.message});
        }
    });

    app.get("/logout", (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.send("Erro ao fazer logout");
            }
            res.render("login");
        });
    });
    

    console.log(`Connected to the port http://localhost:${port}`);
    app.listen(port);

