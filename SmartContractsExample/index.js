console.clear();

const { 
    AccountId,
	PrivateKey,
    Client, 
    FileCreateTransaction,
	ContractCreateTransaction,
	ContractFunctionParameters,
	ContractExecuteTransaction,
	ContractCallQuery,
	Hbar } = require("@hashgraph/sdk");
require("dotenv").config();
const fs = require("fs");

async function main() {
    console.clear();
    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = AccountId.fromString(process.env.OPERATOR_ID);
    const myPrivateKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
   

    // If we weren't able to grab it, we should throw a new error
    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    // Create our connection to the Hedera network
    // The Hedera JS SDK makes this really easy!
    const client = Client.forTestnet();

    client.setOperator(myAccountId, myPrivateKey);

    

    // Import the compiled contract bytecode
	const contractBytecode = fs.readFileSync("LookupContract_sol_LookupContract.bin");

    console.log(contractBytecode);

   //Create a file on Hedera and store the bytecode
    const transaction = await new FileCreateTransaction()
    .setKeys([myPrivateKey]) 
    .setContents(contractBytecode)     
    .freezeWith(client);

    //Sign with the file private key
    const signTx = await transaction.sign(myPrivateKey);

    //Sign with the client operator private key and submit to a Hedera network
    const submitTx = await signTx.execute(client);

    //Request the receipt
    const receipt = await submitTx.getReceipt(client);

    //Get the file ID
    const newFileId = receipt.fileId;

    console.log("The new file ID is: " + newFileId);

    // Instantiate the smart contract
	const contractInstantiateTx = new ContractCreateTransaction()
    .setBytecodeFileId(newFileId)
    .setGas(100000)
    .setConstructorParameters(
        new ContractFunctionParameters().addString("Alice").addUint256(111111)
    );
    const contractInstantiateSubmit = await contractInstantiateTx.execute(client);
    const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(client);
    const contractId = contractInstantiateRx.contractId;
    const contractAddress = contractId.toSolidityAddress();
    console.log(`- The smart contract ID is: ${contractId} \n`);
    console.log(`- The smart contract ID in Solidity format is: ${contractAddress} \n`);

    // Query the contract to check changes in state variable
	const contractQueryTx = new ContractCallQuery()
    .setContractId(contractId)
    .setGas(100000)
    .setFunction("getMobileNumber", new ContractFunctionParameters().addString("Alice"));
    const contractQuerySubmit = await contractQueryTx.execute(client);
    const contractQueryResult = contractQuerySubmit.getUint256(0);
    console.log(`- Here's the phone number that you asked for: ${contractQueryResult} \n`);

    // Call contract function to update the state variable
	const contractExecuteTx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(100000)
    .setFunction(
        "setMobileNumber",
        new ContractFunctionParameters().addString("Bob").addUint256(222222)
    );
    const contractExecuteSubmit = await contractExecuteTx.execute(client);
    const contractExecuteRx = await contractExecuteSubmit.getReceipt(client);
    console.log(`- Contract function call status: ${contractExecuteRx.status} \n`);

    // Query the contract to check changes in state variable
	const contractQueryTx1 = new ContractCallQuery()
    .setContractId(contractId)
    .setGas(100000)
    .setFunction("getMobileNumber", new ContractFunctionParameters().addString("Bob"));
    const contractQuerySubmit1 = await contractQueryTx1.execute(client);
    const contractQueryResult1 = contractQuerySubmit1.getUint256(0);
    console.log(`- Here's the phone number that you asked for: ${contractQueryResult1} \n`);


}
main();