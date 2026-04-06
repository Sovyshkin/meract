import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../shared/api/api";
import styles from "../pay/PayPage.module.css";
import back from "../../images/arrow-left.png";
import searchIcon from "../../images/search.png";
import userimg from "../../images/user.png";


const AddMember = () => {
    const navigate = useNavigate();
    const { type } = useParams();
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get("/user/all-users");
                setAllUsers(response.data);
            } catch (error) {
                console.error("err:", error);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = allUsers.filter(u =>
        (u.login ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleConfirm = (user) => {
        navigate("/team", {
            state: {
                selectedMember: {
                    id: user.id,
                    name: user.login ?? user.email ?? 'Unknown',
                    imageUrl: null,
                    type: type
                }
            }
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header_cont}>
                <img src={back} alt="back" onClick={() => navigate("/team")} style={{ cursor: "pointer" }} />
                <div className="name"><h1>Select user</h1></div>
                <div></div>
            </div>
            <div className={styles.nav}>
                <div className={styles.searchWrapper}>
                    <img src={searchIcon} alt="search" className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Enter username"
                        className={styles.input}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className={styles.cardcont}>
                <p style={{ color: "rgb(173, 173, 173)" }}>All users</p>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div
                            key={user.id}
                            className={styles.card}
                            onClick={() => handleConfirm(user)}
                        >
                            <div className={styles.rankBadge}>
                                <img src={userimg} alt="avatar" className={styles.rankImg} style={{ color: "white", fontSize: "small" }} />
                            </div>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{user.login ?? user.email ?? 'Unknown'}</p>
                                <p style={{ color: "rgb(173, 173, 173)", fontSize: "12px", margin: 0 }}>{user.email}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: "white", margin: "auto", textAlign: "center" }}>
                        {searchQuery ? "No users found" : "No users"}
                    </p>
                )}
            </div>
        </div>
    );
}
export default AddMember;
