import * as Path from 'path';
import * as FS from 'fs-extra';
import {
    command,
    Command,
    param,
} from 'clime';

import * as Inquirer from 'inquirer';
import * as Chalk from 'chalk';
import * as Villa from 'villa';
import { Spinner } from 'cli-spinner';

import {
    safeStat,
    exec,
    installPackagesFromNPM
} from '../util';

import {
    CWD,
    UNIAPP_CONF_PATH,
    LOCAL_UNIAPP_CONF_PATH
} from '../constants';

interface FormResult {
    name: string;
    framework: string;
    description: string;
    author: string;
}

export interface FrameworkInfo {
    name: string;
    description: string;
}

@command({
    brief: 'Create and initialize a new project'
})
export default class InitCommand extends Command {
    async execute(
        @param({
            required: true,
            type: String,
            description: 'project name'
        })
        projectName: string
    ) {
        let projectPath = Path.resolve(CWD, projectName)

        if (await safeStat(projectPath)) {
            throw `Directory '${projectName}' already exists.`;
        }

        let form = await InitCommand._fillingForm();
        form.name = projectName;

        try {
            await this._init(projectPath, form);
        } catch (e) {
            await Villa.call(FS.remove, projectPath);
            throw e;
        }
    }

    private async _init(projectPath: string, form: FormResult) {
        let spinner = new Spinner('Installing project...');
        spinner.setSpinnerString('|/-\\');
        spinner.start();

        try {
            console.log(`Creating a new ${Chalk.bold(form.framework)} project in ${Chalk.bold(projectPath)}`);

            await Villa.call(FS.ensureDir, projectPath);
            await Villa.call(FS.writeFile,
                Path.join(projectPath, 'package.json'),
                InitCommand._generatorPackageConfigContent(form)
            );
            await Villa.call(FS.writeFile,
                Path.join(projectPath, 'uniapp-conf.json'),
                InitCommand._generatorUniappConfigContent(form)
            );
            await installPackagesFromNPM(projectPath, [
                'uniapp@latest',
                `${form.framework}@latest`,
                'react@latest',
            ]);

        } catch (e) {
            throw e;
        } finally {
            spinner.stop(true);
        }

        console.log(Chalk.green('\n=^_^= Initialization is complete!'));

    }

    private static async _fillingForm(): Promise<FormResult> {
        let frameworks = InitCommand._getSupportedFrameworks();

        return await Inquirer.prompt([
            {
                type: "list",
                name: "framework",
                message: "Choice a framework for your project",
                choices: frameworks.map((framework: any) => {
                    return {
                        value: framework.name,
                        name: `${Chalk.bold(framework.name)} - ${framework.description}`
                    };
                })
            },
            {
                type: "input",
                name: "description",
                message: "description:"
            },
            {
                type: "input",
                name: "author",
                message: "author:"
            }
        ]) as any;
    }

    private static _getSupportedFrameworks(): FrameworkInfo[] {
        let uniappConf = require(UNIAPP_CONF_PATH);
        return uniappConf.frameworks || [];
    }

    private static _generatorPackageConfigContent(form: FormResult) {
        let packageConfig = {
            name: form.name,
            version: '0.0.1',
            description: '',
            repository: '',
            license: '',
            main: '',
            scripts: {},
            author: form.author,
            dependencies: {},
            devDependencies: {}
        };

        return JSON.stringify(packageConfig, null, '  ');
    }

    private static _generatorUniappConfigContent(form: FormResult) {
        let uniappConfig = {
            framework: form.framework
        };

        return JSON.stringify(uniappConfig, null, '  ');
    }
}
