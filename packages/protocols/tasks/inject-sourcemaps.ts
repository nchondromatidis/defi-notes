import {task} from "hardhat/config";
import {HardhatRuntimeEnvironment} from "hardhat/types/hre";
import path from "node:path";
import fs from "node:fs";
import {LazyActionObject, NewTaskActionFunction} from "hardhat/types/tasks";
import * as url from "node:url";
import {fileURLToPath} from "node:url";


export function injectSourceMaps(artifactsPath: string)  {
  const buildInfoDir = path.join(artifactsPath, "build-info");
  const files = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".output.json"));
  if (files.length === 0) throw new Error("No build-info files found");

  for (const file of files) {
    const filePath = path.join(buildInfoDir, file);
    const buildInfo = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    for (const [sourceFile, contracts] of Object.entries<any>(buildInfo.output.contracts)) {
      for (const [contractName, contractData] of Object.entries<any>(contracts)) {
        const sourceFileCleaned = sourceFile.replace("project/", "");
        const artifactPath = path.join(
          artifactsPath,
          sourceFileCleaned,
          `${contractName}.json`
        );
        if (!fs.existsSync(artifactPath)) continue;

        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

        artifact.bytecodeSourceMap = contractData.evm.bytecode.sourceMap;
        artifact.deployedBytecodeSourceMap = contractData.evm.deployedBytecode.sourceMap;

        fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
        console.log(`Injected sourcemaps into ${buildInfo.id} ${artifactPath}`);
      }
    }
  }

}

const injectSourceMapsAction: NewTaskActionFunction<{}> = async (taskArguments: {}, hre: HardhatRuntimeEnvironment) =>  {
  injectSourceMaps(hre.config.paths.artifacts);
}

function lazy<T>(fn: T): LazyActionObject<T> {
  return () => Promise.resolve({ default: fn });
}

// TODO: cannot make this task to register in Hardhat v3, so I ran it as a standalone script
task("inject-sourcemaps" , "Add sourceMap into contract artifacts").setAction(lazy(injectSourceMapsAction));

export default {};


if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  // TODO: fix that
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const hardCodedArtifactsPath = path.join(__dirname, "..", "artifacts");
  injectSourceMaps(hardCodedArtifactsPath);
}
