const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

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
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.numeroPessoasValidator));
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
            return await step.prompt(TEXT_PROMPT, 'Qual o seu codigo para cancelar a reserva?');
        } else {
            await step.context.sendActivity("Você não definiu ninguém para a reserva.");
            endDialog = true;
            return await step.endDialog();
        }
    }

    async reservaCancelada(step) {
        endDialog = false;
        return await step.prompt(TEXT_PROMPT, 'Reserva cancelada com sucesso.');
    
    }
        
           
    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.CancelarReservaDialog = CancelarReservaDialog;