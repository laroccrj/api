/* tslint:disable */
import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from 'tsoa';
import { iocContainer } from './../../../lib/ioc';
import { AuthController } from './../../controllers/authController';
import { expressAuthentication } from './../../../lib/auth/expressAuthentication';

const models: TsoaRoute.Models = {
    "AuthenticateResponse": {
        "properties": {
            "redirectURL": { "dataType": "string", "required": true },
        },
    },
    "SteamProfile": {
        "properties": {
            "steamid": { "dataType": "string", "required": true },
            "personaname": { "dataType": "string", "required": true },
            "profileurl": { "dataType": "string", "required": true },
            "avatar": { "dataType": "string", "required": true },
            "avatarmedium": { "dataType": "string", "required": true },
            "avatarfull": { "dataType": "string", "required": true },
        },
    },
    "ValidateResponse": {
        "properties": {
            "token": { "dataType": "string", "required": true },
            "steamProfile": { "ref": "SteamProfile", "required": true },
        },
    },
};

export function RegisterRoutes(app: any) {
    app.get('/auth/steam',
        function(request: any, response: any, next: any) {
            const args = {
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<AuthController>(AuthController);


            const promise = controller.authenticate.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/auth/steam/validate',
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<AuthController>(AuthController);


            const promise = controller.validate.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });


    function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode;
                if (controllerObj instanceof Controller) {
                    const controller = controllerObj as Controller
                    const headers = controller.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.set(name, headers[name]);
                    });

                    statusCode = controller.getStatus();
                }

                if (data) {
                    response.status(statusCode | 200).json(data);
                } else {
                    response.status(statusCode | 204).end();
                }
            })
            .catch((error: any) => next(error));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const fieldErrors: FieldErrors = {};
        const values = Object.keys(args).map((key) => {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return ValidateParam(args[key], request.query[name], models, name, fieldErrors);
                case 'path':
                    return ValidateParam(args[key], request.params[name], models, name, fieldErrors);
                case 'header':
                    return ValidateParam(args[key], request.header(name), models, name, fieldErrors);
                case 'body':
                    return ValidateParam(args[key], request.body, models, name, fieldErrors, name + '.');
                case 'body-prop':
                    return ValidateParam(args[key], request.body[name], models, name, fieldErrors, 'body.');
            }
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }
}
