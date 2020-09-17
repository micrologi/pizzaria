const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

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
});

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';


var endDialog = false;

class CancelarReservaDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('cancelarReservaDialog');

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.cancelarReserva.bind(this), //Confirma se deseja cancelar
            this.obtercodigo.bind(this), //Pedi nome do cliente
            this.reservaCancelada.bind(this), //Pedi nome do cliente
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {

        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);

        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }

    }

    async cancelarReserva(step) {
        endDialog = false;
        return await step.prompt(CONFIRM_PROMPT, 'Deseja cancelar sua reserva?', ['Sim', 'Não']);
    }

    async obtercodigo(step) {
        if (step.result === true) {
            return await step.prompt(NUMBER_PROMPT, 'Qual o código da reserva?');
        }
    }


    async reservaCancelada(step) {
        step.values.idreserva = step.result;

        // MAC - Update  a reserva 
        var sql = "";
        sql += " update reserva  ";
        sql += " set status_marlon = 2 ";
        sql += " where id=" + step.values.idreserva;

        console.log(sql);

        con.query(sql, async function (err, result) {
            if (err) throw err;
        });

        await step.context.sendActivity("Reserva cancelada com sucesso!");
        
        endDialog = true;
        return await step.endDialog();
    }


    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.CancelarReservaDialog = CancelarReservaDialog;