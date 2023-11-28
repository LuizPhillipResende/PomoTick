    import bodyParser from 'body-parser';
    import {User, Todo} from './app/schemas/user.js';
    import express from 'express';
    import bcrypt from 'bcryptjs';
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

    //registrar usuario
    app.post("/signup", async (req, res) => {
        const data = {name: req.body.name, email: req.body.email, password: req.body.password, role: req.body.role};
        
        //verificar se o usuario ja existe
        const verifyUser = await User.findOne({email: data.email});
        if(verifyUser){
            res.send("Usuário já existente, tente recuperar a senha!");
        }else{
            //mantendo a senha secreta usando bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);

            data.password = hashedPassword; //trocando senha com a senha do bcrypt

            const userdata = await User.insertMany(data);
            res.render("login");
        }
    })

    //validar usuario
    app.post("/home", async (req, res) => {
        try {
            //verificar se existe
            const foundUser = await User.findOne({ email: req.body.email });
            if (!foundUser) {
                return res.send("Usuário não encontrado!");
            }
    
            //verificar acesso de usuario 
            if (foundUser.hasAccess('user')) {
                const isPassMatch = await bcrypt.compare(req.body.password, foundUser.password);
                //verificar senha com bcrypt
                if (isPassMatch) {
                    req.session.User = foundUser;
                    return res.render("home");
                } else {
                    return res.send("Senha incorreta!");
                }
            } else {
                return res.send("Erro na identificação");
            }
    
        } catch (error) {
            return res.send("Email ou senha incorreto!");
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

      app.get('/loadUserData', async (req, res) => {
        if (!req.session.User) {
            return res.status(401).json({ success: false, error: 'Usuario não identificado!' });
        }
    
        const email = req.session.User.email;
    
        try {
            const todo = await Todo.findOne({ email });
            res.json({ success: true, todo });
        } catch (error) {
            res.json({ success: false, error: error.message });
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

