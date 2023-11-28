const {user, validate} = require('../models/user.js');
const express = require('express');
const router = express.Router();

//fazendo o post como função assincrona para o uso do await
router.post('/', async(req, res) => {
    //Validação do Request
    const {error} = validate(req.body);
    if(error){
        return res.status(400).send(error.details[0].message);
    }

    //Verificação se o usuario ja existe
    //await para esperar que a execução seja resolvida
    let user = await user.findOne({email: req.body.email});
    //Erro se o usuario ja existir
    if(user){
        return res.status(400).send('O usuário ja existe!');
    }else{
        user = new user({
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha 
        });
        await user.save();
        res.send(user);
    }

});

module.exports = router;