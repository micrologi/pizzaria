// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');
const { FazerReservaDialog } = require('./componentDialogs/fazerReservaDialog');

class Pizzaria extends ActivityHandler {

    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty("dialogState");

        this.fazerReservaDialog = new FazerReservaDialog(this.conversationState, this.userState);

        this.previousIntent = this.conversationState.createProperty("previousIntent");
        this.conversationData = this.conversationState.createProperty('conservationData');

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            await this.dispatchToIntentAsync(context);
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

    async dispatchToIntentAsync(context) {

        var currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = context.activity.text;
        } else {
            currentIntent = context.activity.text;
            await this.previousIntent.set(context, { intentName: context.activity.text });
        }

        switch (currentIntent) {
            case 'Fazer Reserva':
                console.log("Fazer Reserva");
                await this.conversationData.set(context, { endDialog: false });
                await this.fazerReservaDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.fazerReservaDialog.isDialogComplete();
                if (conversationData.endDialog) {
                    await this.previousIntent.set(context, { intentName: null });
                    await this.enviarAcoesSugeridas(context);

                }
                break;

            case 'Cancelar Reserva':
                console.log("Cancelar Reserva");
                break;

            default:
                console.log("Intenção não tratada");
                break;
        }
    }


}

module.exports.Pizzaria = Pizzaria;
