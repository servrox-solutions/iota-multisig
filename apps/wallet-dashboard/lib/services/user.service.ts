const initialUsers = [
    {
        address: '0x1234',
        publicKey: 'abc',
    },
    {
        address: '0x1234',
        publicKey: 'abc',
    },
    {
        address: '0x52636b2b2757409742067cba944042fa5064cc5ac1e32b9f6ef4bd5d229b5385',
        publicKey: 'abc',
    },
];

const users = () => {
    const users = localStorage.getItem('users');
    if (!users) localStorage.setItem('users', JSON.stringify(initialUsers));
    console.log(users);
    return JSON.parse(localStorage.getItem('users')!) as typeof initialUsers;
};

export const addUser = (newUser: { address: string; publicKey: string }) => {
    const u = users();
    if (!u.find((x) => x.address === newUser.address)) {
        u.push(newUser);
    }
    localStorage.setItem('users', JSON.stringify(u));
};

export const getPublicKeyForAddress = (address: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const pubKey = users().find((user) => user.address === address)?.publicKey;
        if (pubKey) resolve(pubKey);
        reject();
    });
};
