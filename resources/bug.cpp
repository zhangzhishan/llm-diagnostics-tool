int main()
{
    int x = 42;
    x = "Hello, World!"; // This line is incorrect because x is an int, not a string.

    // create a memory leak by not deleting the allocated memory
    int* leak = new int[10]; // Memory allocated but not deleted.

    // A failure pointer due to resize of a vector.
    std::vector<int> vec;
    std::vector<int*> vecPtr;
    for (int i = 0; i < 10; ++i) {
        vec.push_back(i);
        vecPtr.push_back(&vec[i]);
    }

    return 0;
}