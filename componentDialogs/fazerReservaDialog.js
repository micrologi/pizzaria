const {WaterfallDialog, ComponentDialog} = require('botbuilder-dialogs');
const {ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt} = require('botbuilder-dialogs');
const {DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const mysql = require('mysql');

var con = mysql.createConnection({
    host: "mysql.webagencia.com.br",
    user: "senai",
    password: "senai123",
    port: "3306",
    database: "senai"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Conectado no banco de dados remoto.");
});

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = false;

class FazerReservaDialog extends ComponentDialog {

    constructor(conservsationState,userState) {
        super('fazerReservaDialog'); 

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.numeroPessoasValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.iniciarReserva.bind(this), //Confirma se deseja reservar
            this.obterNome.bind(this), //Pedi nome do cliente
            this.obterNumeroPessoas.bind(this),  //Numero de pessoas
            this.obterData.bind(this), //Data da reserva
            this.obterHora.bind(this),  //Hora da reserva
            this.confirmarReserva.bind(this), //Exibe resumo das informacoes da reserva e solicita confirmacao
            this.resumoReserva.bind(this) //Exibe resumo das informacoes da reserva e solicita confirmacao                
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor, entities) {

        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }

    }

    async iniciarReserva(step) {
        console.log('1');
        console.log(step._info.options.numeropessoas);
       // step.values.numeropessoas = step._info.options.numeropessoas[0];
        console.log('2');

        endDialog = false;
        return await step.prompt(CONFIRM_PROMPT, 'Deseja realizar uma reserva?', ['Sim', 'Não']);
    }

    async obterNome(step) {
        if (step.result === true) {
            return await step.prompt(TEXT_PROMPT, 'Qual o seu nome para a reserva?');
        } else {
            await step.context.sendActivity("Você não definiu ninguém para a reserva.");
            endDialog = true;
            return await step.endDialog();             
        }
    }

    async obterNumeroPessoas(step) {
        step.values.nome = step.result;

        if (!step.values.numeropessoas) {
            return await step.prompt(NUMBER_PROMPT, 'Qual o número de pessoas (1-50)?');
        } else {
            return await step.continueDialog();
        }

    }

    async obterData(step) {

        if (!step.values.numeropessoas)
            step.values.numeropessoas = step.result;
        return await step.prompt(DATETIME_PROMPT, 'Qual a data para a reserva?');
    }

    async obterHora(step) {
        step.values.data = step.result;
        return await step.prompt(DATETIME_PROMPT, 'Qual a hora para a reserva (18:00 - 23:00)?');
    }

    async confirmarReserva(step) {
        step.values.hora = step.result;

        var data = JSON.parse(JSON.stringify(step.values.data));
        var hora = JSON.parse(JSON.stringify(step.values.hora));

        var msg = `Verifique os dados da sua reserva:\n 
                    Nome: ${step.values.nome}\n
                    Pessoas: ${step.values.numeropessoas}\n
                    Data: ${data[0]['value']}\n
                    Hora: ${hora[0]['value']}\n`;

        await step.context.sendActivity(msg);        
        return await step.prompt(CONFIRM_PROMPT, 'Confirma a reserva?', ['Sim', 'Não']);
    }

    async resumoReserva(step) {
        if (step.result === true) {

            var data = JSON.parse(JSON.stringify(step.values.data));
            var hora = JSON.parse(JSON.stringify(step.values.hora));
        
            var sql = "";
            sql += "insert into ";
            sql += " reserva ";
            sql += " (nome, qtdpessoas, data, hora) ";
            sql += " values ";
            sql += " ('" + step.values.nome + "', " + step.values.numeropessoas + ", '" + data[0]['value'] + "', '" + hora[0]['value'] + "'); ";

            con.query(sql, async function (err, result) {
                if (err) throw err;
                console.log("Reserva inserida no banco de dados.");
            });


            await step.context.sendActivity('Reserva efetuada com sucesso.');
            endDialog = true;
            return await step.endDialog();
        }        
    }

    async numeroPessoasValidator(promptContext) {
        return promptContext.recognized.succeeded && promptContext.recognized.value >= 1 && promptContext.recognized.value <= 50;
    }

    async isDialogComplete(){
        return endDialog;
    }    

}

module.exports.FazerReservaDialog = FazerReservaDialog;