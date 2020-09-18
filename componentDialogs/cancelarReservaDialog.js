const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const mysql = require('mysql');
var   con = "";

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

        con = mysql.createConnection({
            host: process.env.DB_host,
            user: process.env.DB_user,
            password: process.env.DB_password,
            port: process.env.DB_port,
            database: process.env.DB_database
        });
        
        con.connect(function (err) {
            if (err) throw err;
        });

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

    async run(turnContext, accessor, entities) {

        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);

        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }

    }

    async cancelarReserva(step) {
        endDialog = false;

        return await step.prompt(CONFIRM_PROMPT, 'Deseja cancelar sua reserva?', ['Sim', 'Não']);
    }

    async obtercodigo(step) {

        //console.log(step._info.options);

        if ('id' in step._info.options) {
            step.values.id = step._info.options.id[0];
        }

        if (step.result === true) {

            if (!step.values.id) {
                return await step.prompt(NUMBER_PROMPT, 'Qual o código da reserva?');
            } else {
                return await step.continueDialog();
            }    

        }
    }


    async reservaCancelada(step) {
        if (!step.values.id) {
            step.values.id = step.result;
        }

        // MAC - Update  a reserva 
        var sql = "";
        sql += " update reserva  ";
        sql += " set status = 2 ";
        sql += " where id=" + step.values.id;

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