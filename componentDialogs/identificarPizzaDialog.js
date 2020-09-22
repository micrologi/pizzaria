const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const { PredictionAPIClient } = require("@azure/cognitiveservices-customvision-prediction");
const { ApiKeyCredentials } = require("@azure/ms-rest-js");

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = false;

class IdentificarPizzaDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('identificarPizzaDialog');

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.identificarSabor.bind(this),
            this.saborIdentificado.bind(this),
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

    async identificarSabor(step) {
        endDialog = false;

        const credentials = new ApiKeyCredentials({ inHeader: { "Prediction-key": process.env.CustonVisionKey } });
        const client = new PredictionAPIClient(credentials, process.env.CustonVisionEndpoint);

        //console.log(step.context.activity['attachments'][0].contentUrl);

        console.log(result);

        await client
            .classifyImageUrl(process.env.CustonVisionProjectId, process.env.CustonVisionIteration,
                { url: step.context.activity['attachments'][0].contentUrl })
            .then(result => {
                if ('predictions' in result) {
                    
                }
            })
            .catch(err => {
                //step.context.sendActivity("Não consegui identificar a pizza nessa imagem. Tente enviar outra imagem!");
                console.error(err);
            });

        step.context.sendActivity(result.predictions[0].tagName);
        return await step.continueDialog();
    }


    async saborIdentificado(step) {

        endDialog = true;
        return await step.endDialog();
    }


    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.IdentificarPizzaDialog = IdentificarPizzaDialog;