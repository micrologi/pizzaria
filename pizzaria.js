const { ActivityHandler, MessageFactory } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');

const { FazerReservaDialog } = require('./componentDialogs/fazerReservaDialog');
const { CancelarReservaDialog } = require('./componentDialogs/cancelarReservaDialog');

class Pizzaria extends ActivityHandler {

    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty("dialogState");

        this.fazerReservaDialog = new FazerReservaDialog(this.conversationState, this.userState);
        this.cancelarReservaDialog = new CancelarReservaDialog(this.conversationState, this.userState);

        this.previousIntent = this.conversationState.createProperty("previousIntent");
        this.conversationData = this.conversationState.createProperty('conservationData');

        // MAC - LUIS Integração
        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: process.env.LuisAPIHostName
        }, {
            includeAllIntents: true
            //includeInstanceData: true
        }, true);

        // MAC - QNA Integração
        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAknowledgeBaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });
        this.qnaMaker = qnaMaker;

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const luisResult = await dispatchRecognizer.recognize(context);

            const intent = LuisRecognizer.topIntent(luisResult);
            const entities = luisResult.entities;

            await this.dispatchToIntentAsync(context, intent, entities);
            await next();
        });

        this.onDialog(async (context, next) => {
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            await this.enviarMensagemBoasVindas(context);
            await next();
        });
    }

    async enviarMensagemBoasVindas(turnContext) {
        const { activity } = turnContext;

        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
                const bemvindoMensagem = `Bem vindo a pizzaria da Nona, ${activity.membersAdded[idx].name}.`;
                await turnContext.sendActivity(bemvindoMensagem);
                await this.enviarAcoesSugeridas(turnContext);
            }
        }
    }

    async enviarAcoesSugeridas(turnContext) {
        var resposta = MessageFactory.suggestedActions(
            ['Fazer Reserva', 'Cancelar Reserva', 'Endereço da pizzaria?'], 'O que gostaria de fazer?');
        await turnContext.sendActivity(resposta);
    }

    // MAC - O dispatch roteia as entradas para o melhor modelo
    // https://docs.microsoft.com/pt-br/azure/bot-service/bot-builder-tutorial-dispatch?view=azure-bot-service-4.0&tabs=cs
    async dispatchToIntentAsync(context, intent, entities) {

        var currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            //currentIntent = context.activity.text;
            currentIntent = intent;
        } else {
            //currentIntent = context.activity.text;
            //await this.previousIntent.set(context, { intentName: context.activity.text });
            currentIntent = intent;
            await this.previousIntent.set(context, { intentName: intent });
        }

        console.log(currentIntent);

        // MAC - Tratamento via LUIS
        switch (currentIntent) {
            //case 'Fazer Reserva':     //Intenções não podem conter espaços, por isso mudamos a forma como tratamos a intenção
            case 'Fazer_Reserva':
                await this.conversationData.set(context, { endDialog: false });
                await this.fazerReservaDialog.run(context, this.dialogState, entities);
                conversationData.endDialog = await this.fazerReservaDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntent.set(context, { intentName: null });
                    await this.enviarAcoesSugeridas(context);

                }
                break;

            case 'Cancelar_Reserva':
                await this.conversationData.set(context, { endDialog: false });
                await this.cancelarReservaDialog.run(context, this.dialogState, entities);
                conversationData.endDialog = await this.cancelarReservaDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntent.set(context, { intentName: null });
                    await this.enviarAcoesSugeridas(context);

                }
                break;

            // MAC - Tratamento via QNA (Se nenhuma intenção do LUIS, trata com QNA)
            default:
                var result = await this.qnaMaker.getAnswers(context);

                if (result[0]) {
                    await context.sendActivity(`${result[0].answer}`);
                } else {
                    // MAC - Se não achou a resposta no QNA, exibe uma mensagem padrão e dá o menu de Ações Sugeridas
                    await context.sendActivity('Não consegui compreender o que deseja.');
                    await this.enviarAcoesSugeridas(context);
                }

                break;
        }
    }


}

module.exports.Pizzaria = Pizzaria;
