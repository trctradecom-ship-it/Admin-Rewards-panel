let provider, signer, contract, user, chart;

const contractAddress = "0x90327AB897f56FEdC9B84AF26327e3D69FE6a590";
 
const abi = [
    "function owner() view returns(address)",
    "function rewardPool() view returns(uint256)",
    "function taxPool() view returns(uint256)",
    "function contractTRCBalance() view returns(uint256)",
    "function getTRCPriceUSD() view returns(uint256)",
    "function emaPrice() view returns(uint256)",

    "function depositReward(uint256 amount)",
    "function withdrawRewardPool(uint256 amount)",
    "function withdrawTax()",

    "function setPriceSourceToManual(uint256)",
    "function setPriceSourceToDex(address)",
    "function setPriceSourceToEMA()",
    "function setPriceSourceToICO()",

    "function initializeEMA()",
    "function updateEMA() nonpayable"
];

// ================= STATUS =================
function updateStatus(msg){
    document.getElementById("status").innerHTML = msg;
}

// ================= CONNECT WALLET =================
document.getElementById("connectBtn").onclick = async () => {
    try{
        if(!window.ethereum) return alert("Install MetaMask");

        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        user = await signer.getAddress();

        contract = new ethers.Contract(contractAddress, abi, signer);

        const owner = await contract.owner();

        document.getElementById("wallet").innerText =
            user.slice(0,6) + "..." + user.slice(-4);

        if(user.toLowerCase() === owner.toLowerCase()){
            updateStatus("✅ Owner Connected");
        } else {
            updateStatus("⚠️ Not Owner");
        }

        await loadData();
        initChart();

    }catch(e){
        console.error(e);
        updateStatus("❌ Connection failed");
    }
};

// ================= LOAD DATA =================
async function loadData(){
    try{
        const rewardPool = await contract.rewardPool();
        const taxPool = await contract.taxPool();
        const balance = await contract.contractTRCBalance();
        const price = await contract.getTRCPriceUSD();

        document.getElementById("rewardPool").innerText =
            ethers.utils.formatUnits(rewardPool,18);

        document.getElementById("taxPool").innerText =
            ethers.utils.formatUnits(taxPool,18);

        document.getElementById("contractBalance").innerText =
            ethers.utils.formatUnits(balance,18);

        document.getElementById("trcPrice").innerText =
            ethers.utils.formatUnits(price,18);

        updateChart(ethers.utils.formatUnits(balance,18));

    }catch(e){
        console.log(e);
    }
}

// ================= TRANSACTION HANDLER =================
async function handleTx(txPromise){
    try{
        updateStatus("⏳ Sending transaction...");
        const tx = await txPromise;

        updateStatus(`
        TX Sent<br>
        <a href="https://polygonscan.com/tx/${tx.hash}" target="_blank">View Transaction</a>
        `);

        await tx.wait();

        updateStatus("✅ Transaction Confirmed");

        await loadData();

    }catch(e){
        console.error(e);
        updateStatus("❌ Transaction Failed");
    }
}

// ================= OWNER FUNCTIONS =================

// Deposit Reward
document.getElementById("depositBtn").onclick = async () => {
    const amount = document.getElementById("depositAmount").value;
    if(!amount) return alert("Enter amount");

    const parsed = ethers.utils.parseUnits(amount,18);
    handleTx(contract.depositReward(parsed));
};

// Withdraw Reward Pool
document.getElementById("withdrawRewardBtn").onclick = async () => {
    const amount = document.getElementById("withdrawRewardAmount").value;
    if(!amount) return alert("Enter amount");

    const parsed = ethers.utils.parseUnits(amount,18);
    handleTx(contract.withdrawRewardPool(parsed));
};

// Withdraw Tax
document.getElementById("withdrawTaxBtn").onclick = async () => {
    handleTx(contract.withdrawTax());
};

// ================= PRICE CONTROLS =================

// Manual Price
document.getElementById("setManualBtn").onclick = async () => {
    const price = document.getElementById("manualPrice").value;
    if(!price) return alert("Enter price");

    const parsed = ethers.utils.parseUnits(price,18);
    handleTx(contract.setPriceSourceToManual(parsed));
};

// Set DEX
document.getElementById("setDexBtn").onclick = async () => {
    const pair = document.getElementById("dexAddress").value;
    if(!pair) return alert("Enter pair address");

    handleTx(contract.setPriceSourceToDex(pair));
};

// Set EMA Source
document.getElementById("setEmaBtn").onclick = async () => {
    handleTx(contract.setPriceSourceToEMA());
};

// Set ICO Source
document.getElementById("setIcoBtn").onclick = async () => {
    handleTx(contract.setPriceSourceToICO());
};

// Initialize EMA (ALWAYS ENABLED)
document.getElementById("initEmaBtn").onclick = async () => {
    handleTx(contract.initializeEMA());
};

// Update EMA manually
document.getElementById("updateEmaBtn").onclick = async () => {
    if(!contract) return alert("Connect wallet first");
    handleTx(contract.updateEMA());
};

// ================= CHART =================
function initChart(){
    const ctx = document.getElementById("chart").getContext("2d");

    chart = new Chart(ctx,{
        type: "line",
        data:{
            labels:[],
            datasets:[{
                label:"TRC Balance",
                data:[],
                tension:0.4
            }]
        },
        options:{
            responsive:true,
            maintainAspectRatio:false
        }
    });
}

function updateChart(value){
    if(!chart) return;

    const time = new Date().toLocaleTimeString();

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(value);

    if(chart.data.labels.length > 20){
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}

// ================= AUTO REFRESH =================
setInterval(() => {
    if(contract) loadData();
}, 10000);
